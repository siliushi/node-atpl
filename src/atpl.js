/*!
 * ATPL
 * template engine
 */
/**
 * author: keven
 * date: 2016-10-20
 */

var utils = require('./utils/index')
  , path = require('path')
  , dirname = path.dirname
  , extname = path.extname
  , join = path.join
  , fs = require('fs')
  , read = fs.readFileSync
  , resolve = path.resolve
  , exists = fs.existsSync || path.existsSync
  , basename = path.basename;

/**
 * 过滤器
 *
 * @type Object
 */

var filters = exports.filters = require('./filters/index');



var cache = {};



exports.clearCache = function(){
  cache = {};
};


function filtered(js) {
  return js.substr(1).split('|').reduce(function(js, filter){
    var parts = filter.split(':')
      , name = parts.shift()
      , args = parts.join(':') || '';
    if (args) args = ', ' + args;
    return 'filters.' + name + '(' + js + args + ')';
  });
};


function rethrow(err, str, filename, lineno){
  var lines = str.split('\n')
    , start = Math.max(lineno - 3, 0)
    , end = Math.min(lines.length, lineno + 3);

  // Error context
  var context = lines.slice(start, end).map(function(line, i){
    var curr = i + start + 1;
    return (curr == lineno ? ' >> ' : '    ')
      + curr
      + '| '
      + line;
  }).join('\n');

  // Alter exception message
  err.path = filename;
  err.message = (filename || 'atpl') + ':'
    + lineno + '\n'
    + context + '\n\n'
    + err.message;

  throw err;
}


var parse = exports.parse = function(str, options){
  var options = options || {}
    , open = options.open || exports.open || '{{'
    , close = options.close || exports.close || '}}'
    , filename = options.filename
    , compileDebug = options.compileDebug !== false
    , buf = "";

  buf += 'var buf = [];';
  if (false !== options._with) buf += '\nwith (locals || {}) { (function(){ ';
  buf += '\n buf.push(\'';

  var lineno = 1;

  var consumeEOL = false;
  for (var i = 0, len = str.length; i < len; ++i) {
    var stri = str[i];
    if (str.slice(i, open.length + i) == open) {
      i += open.length

      var prefix, postfix, line = (compileDebug ? '__stack.lineno=' : '') + lineno;
      switch (str[i]) {
        case '=':
          prefix = "', escape((" + line + ', ';
          postfix = ")), '";
          ++i;
          break;
        case '-':
          prefix = "', (" + line + ', ';
          postfix = "), '";
          ++i;
          break;
        default:
          prefix = "');" + line + ';';
          postfix = "; buf.push('";
      }

      var end = str.indexOf(close, i);

      if (end < 0){
        throw new Error('Could not find matching close tag "' + close + '".');
      }

      var js = str.substring(i, end)
        , start = i
        , include = null
        , n = 0;

      if ('-' == js[js.length-1]){
        js = js.substring(0, js.length - 2);
        consumeEOL = true;
      }

      if (0 == js.trim().indexOf('include')) {
        var name = js.trim().slice(7).trim();
        if (!filename) throw new Error('filename option is required for includes');
        var path = resolveInclude(name, filename);
        include = read(path, 'utf8');
        include = exports.parse(include, { filename: path, _with: false, open: open, close: close, compileDebug: compileDebug });
        buf += "' + (function(){" + include + "})() + '";
        js = '';
      }

      while (~(n = js.indexOf("\n", n))) n++, lineno++;
      
      switch(js.substr(0, 1)) {
        case ':':
          js = filtered(js);
          break;
        case '%':
          js = " buf.push('{{" + js.substring(1).replace(/'/g, "\\'") + "}}');";
          break;
        case '#':
          js = "";
          break;
      }
      
      if (js) {
        if (js.lastIndexOf('//') > js.lastIndexOf('\n')) js += '\n';
        buf += prefix;
        buf += js;
        buf += postfix;
      }
      i += end - start + close.length - 1;

    } else if (stri == "\\") {
      buf += "\\\\";
    } else if (stri == "'") {
      buf += "\\'";
    } else if (stri == "\r") {
      // ignore
    } else if (stri == "\n") {
      if (consumeEOL) {
        consumeEOL = false;
      } else {
        buf += "\\n";
        lineno++;
      }
    } else {
      buf += stri;
    }
  }

  if (false !== options._with) buf += "'); })();\n} \nreturn buf.join('');";
  else buf += "');\nreturn buf.join('');";
  return buf;
};


var compile = exports.compile = function(str, options){
  options = options || {};
  var escape = options.escape || utils.escape;

  var input = JSON.stringify(str)
    , compileDebug = options.compileDebug !== false
    , client = options.client
    , filename = options.filename
        ? JSON.stringify(options.filename)
        : 'undefined';

  if (compileDebug) {
    // Adds the fancy stack trace meta info
    str = [
      'var __stack = { lineno: 1, input: ' + input + ', filename: ' + filename + ' };',
      rethrow.toString(),
      'try {',
      exports.parse(str, options),
      '} catch (err) {',
      '  rethrow(err, __stack.input, __stack.filename, __stack.lineno);',
      '}'
    ].join("\n");
  } else {
    str = exports.parse(str, options);
  }

  if (options.debug) console.log(str);
  if (client) str = 'escape = escape || ' + escape.toString() + ';\n' + str;

  try {
    var fn = new Function('locals, filters, escape, rethrow', str);
  } catch (err) {
    if ('SyntaxError' == err.name) {
      err.message += options.filename
        ? ' in ' + filename
        : ' while compiling atpl';
    }
    throw err;
  }

  if (client) return fn;

  return function(locals){
    return fn.call(this, locals, filters, escape, rethrow);
  }
};


exports.render = function(str, options){
  var fn
    , options = options || {};

  if (options.cache) {
    if (options.filename) {
      fn = cache[options.filename] || (cache[options.filename] = compile(str, options));
    } else {
      throw new Error('"cache" option requires "filename".');
    }
  } else {
    fn = compile(str, options);
  }

  options.__proto__ = options.locals;
  return fn.call(options.scope, options);
};


exports.renderFile = function(path, options, fn){
  var key = path + ':string';

  if ('function' == typeof options) {
    fn = options, options = {};
  }

  options.filename = path;

  var str;
  try {
    str = options.cache
      ? cache[key] || (cache[key] = read(path, 'utf8'))
      : read(path, 'utf8');
  } catch (err) {
    fn(err);
    return;
  }
  fn(null, exports.render(str, options));
};

function resolveObjectName(view){
  return cache[view] || (cache[view] = view
    .split(path.sep || '/')
    .slice(-1)[0]
    .split('.')[0]
    .replace(/^_/, '')
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .split(/ +/).map(function(word, i){
      return i
        ? word[0].toUpperCase() + word.substr(1)
        : word;
    }).join(''));
};

function resolveInclude(name, filename) {
  var path = join(dirname(filename), name);
  var ext = extname(name);
  if (!ext) path += '.atpl';
  return path;
}

// express support

exports.__express = exports.renderFile;

function partial(view, options){
  var collection
    , object
    , locals
    , name;

  // parse options
  if( options ){
    // collection
    if( options.collection ){
      collection = options.collection;
      delete options.collection;
    } else if( 'length' in options ){
      collection = options;
      options = {};
    }

    // locals
    if( options.locals ){
      locals = options.locals;
      delete options.locals;
    }

    // object
    if( 'Object' != options.constructor.name ){
      object = options;
      options = {};
    } else if( options.object != undefined ){
      object = options.object;
      delete options.object;
    }
  } else {
    options = {};
  }

  // merge locals into options
  if( locals )
    options.__proto__ = locals;

  // merge app locals into 
  for(var k in this.app.locals)
    options[k] = options[k] || this.app.locals[k];

  // merge locals, which as set using app.use(function(...){ res.locals = X; }) 
  for(var k in this.req.res.locals)
    options[k] = options[k] || this.req.res.locals[k];

  // let partials render partials
  options.partial = partial.bind(this);

  // extract object name from view
  name = options.as || resolveObjectName(view);

  // find view
  var root = this.app.get('views') || process.cwd() + '/views'
    , ext = extname(view) || '.' + (this.app.get('view engine')||'atpl')
    , file = lookup(root, view, ext);
  
  // read view
  var source = fs.readFileSync(file,'utf8');

  // set filename option for renderer (Jade requires this for includes)
  options.filename = file;

  // render partial
  function render(){
    if (object) {
      if ('string' == typeof name) {
        options[name] = object;
      } else if (name === global) {
        // wtf?
        // merge(options, object);
      }
    }
    options.locals = locals
    return renderer(ext)(source, options);
  }

  // Collection support
  if (collection) {
    var len = collection.length
      , buf = ''
      , keys
      , key
      , val;

    if ('number' == typeof len || Array.isArray(collection)) {
      options.collectionLength = len;
      for (var i = 0; i < len; ++i) {
        val = collection[i];
        options.firstInCollection = i == 0;
        options.indexInCollection = i;
        options.lastInCollection = i == len - 1;
        object = val;
        buf += render();
      }
    } else {
      keys = Object.keys(collection);
      len = keys.length;
      options.collectionLength = len;
      options.collectionKeys = keys;
      for (var i = 0; i < len; ++i) {
        key = keys[i];
        val = collection[key];
        options.keyInCollection = key;
        options.firstInCollection = i == 0;
        options.indexInCollection = i;
        options.lastInCollection = i == len - 1;
        object = val;
        buf += render();
      }
    }

    return buf;
  } else {
    return render();
  }
}

function lookup(root, view, ext){
  var name = resolveObjectName(view);
  var original = view;

  // Try root ex: <root>/user.jade
  view = resolve(root, basename(original,ext)+ext);
  if( exists(view) ) return view;

  // Try subdir ex: <root>/subdir/user.jade
  view = resolve(root, dirname(original), basename(original,ext)+ext);
  if( exists(view) ) return view;

  // Try _ prefix ex: ./views/_<name>.jade
  // taking precedence over the direct path
  view = resolve(root,'_'+name+ext)
  if( exists(view) ) return view;

  // Try index ex: ./views/user/index.jade
  view = resolve(root,name,'index'+ext);
  if( exists(view) ) return view;

  // Try ../<name>/index ex: ../user/index.jade
  // when calling partial('user') within the same dir
  view = resolve(root,'..',name,'index'+ext);
  if( exists(view) ) return view;

  // Try root ex: <root>/user.jade
  view = resolve(root,name+ext);
  if( exists(view) ) return view;

  return null;
};
module.exports.lookup = lookup;

function renderer(ext){
  if(ext[0] !== '.'){
    ext = '.' + ext;
  }
  return register[ext] != null
    ? register[ext]
    : register[ext] = require(ext.slice(1)).render;
};

module.exports.renderer = renderer;

function register(ext,render){
  if(ext[0] != '.') {
    ext = '.' + ext;
  }
  if(typeof render == 'string') {
    render = require(render);
  }
  if(typeof render.render != 'undefined') {
    register[ext] = render.render;
  } else {
    register[ext] = render;
  }
};

module.exports.register = register;

exports.layout = function(vm) {
  return function(req,res,next){
    // res.partial(view,options) -> res.render() (ignores any layouts)
    res.partial = res.render;

    // in template partial(view,options)
    res.locals.partial = partial.bind(res);

    // layout support
    var _render = res.render.bind(res);
    res.render = function(name, options, fn){
      var layout = options && options.layout;

      // default layout
      if( layout === true || layout === undefined ) {
        // Try to find default layout in view options, if not found, seek for 'layout'
        var viewOptions = res.app.get('view options');
        layout = viewOptions && viewOptions.defaultLayout || vm.layout || 'layout';
      }
      
      // layout
      if( layout ){
        console.log(layout);
        // first render normally
        _render(name, options, function(err, body){
          if( err )
            return fn ? fn(err) : req.next(err);

          options = options || {};
          options.body = body;

          // calculate the layout vars
          var ext = extname(name) || '.'+(res.app.get('view engine') || 'ejs');
          var root = req.app.get('views') || process.cwd() + '/views';
          var dir = dirname(layout) == '.' ? root : resolve(root,dirname(layout));
          var filename = dir+(path.sep||'/')+basename(layout,ext)+ext;

          // See if we even have a layout to use
          // If so, render it. If not, then fallback to just the original template
          if (exists(filename)) {
            layout = dirname(lookup(dir, layout, ext))+(path.sep||'/')+basename(layout,ext)+ext;
            console.log(options);
            _render(layout, options, fn);
          } else {
            // layout may be in the same folder than the view
            dir = dirname(name) == '.' ? root : resolve(root,dirname(name));
            filename = dir+(path.sep||'/')+basename(layout,ext)+ext;

            if(exists(filename)) {
              layout = dirname(lookup(dir, layout, ext))+(path.sep||'/')+basename(layout,ext)+ext;
              _render(layout, options, fn);
            } else {
              _render(name, options, fn);
            }
          }
        })

      // no layout
      } else {
        _render(name, options, fn);
      }
    }

    // done
    next();
  }
};

exports.__layout = exports.layout;

if (require.extensions) {
  require.extensions['.atpl'] = function (module, filename) {
    filename = filename || module.filename;
    var options = { filename: filename, client: true }
      , template = fs.readFileSync(filename).toString()
      , fn = compile(template, options);
    module._compile('module.exports = ' + fn.toString() + ';', filename);
  };
} else if (require.registerExtension) {
  require.registerExtension('.atpl', function(src) {
    return compile(src, {});
  });
}
