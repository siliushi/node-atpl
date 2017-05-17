/*!
 * ATPL - Filters
 * 过滤器
 */

/**
 * 返回第一个元素.
 */

exports.first = function(obj) {
  return obj[0];
};

/**
 * 返回最后一个元素
 */

exports.last = function(obj) {
  return obj[obj.length - 1];
};

/**
 * 首字母大写
 */

exports.capitalize = function(str){
  str = String(str);
  return str[0].toUpperCase() + str.substr(1, str.length);
};

/**
 * 小写
 */

exports.downcase = function(str){
  return String(str).toLowerCase();
};

/**
 * 大写
 */

exports.upcase = function(str){
  return String(str).toUpperCase();
};

/**
 * 排序
 */

exports.sort = function(obj){
  return Object.create(obj).sort();
};

/**
 * 根据key排序
 * 
 */

exports.sort_by = function(obj, prop){
  return Object.create(obj).sort(function(a, b){
    a = a[prop], b = b[prop];
    if (a > b) return 1;
    if (a < b) return -1;
    return 0;
  });
};

/**
 * 返回对象的长度
 */

exports.size = exports.length = function(obj) {
  return obj.length;
};

/**
 * 两数相加
 */

exports.plus = function(a, b){
  return Number(a) + Number(b);
};

/**
 * 两书相减
 */

exports.minus = function(a, b){
  return Number(a) - Number(b);
};

/**
 * 两数相乘
 */

exports.times = function(a, b){
  return Number(a) * Number(b);
};

/**
 * 两书相除
 */

exports.divided_by = function(a, b){
  return Number(a) / Number(b);
};

/**
 * 字符串合并
 */

exports.join = function(obj, str){
  return obj.join(str || ', ');
};

/**
 * 截断str超出的len部分，并且加上append
 * 
 */

exports.truncate = function(str, len, append){
  str = String(str);
  if (str.length > len) {
    str = str.slice(0, len);
    if (append) str += append;
  }
  return str;
};

/**
 * Truncate `str` to `n` words.
 */

exports.truncate_words = function(str, n){
  var str = String(str)
    , words = str.split(/ +/);
  return words.slice(0, n).join(' ');
};

/**
 * Replace `pattern` with `substitution` in `str`.
 */

exports.replace = function(str, pattern, substitution){
  return String(str).replace(pattern, substitution || '');
};

/**
 * Prepend `val` to `obj`.
 */

exports.prepend = function(obj, val){
  return Array.isArray(obj)
    ? [val].concat(obj)
    : val + obj;
};

/**
 * Append `val` to `obj`.
 */

exports.append = function(obj, val){
  return Array.isArray(obj)
    ? obj.concat(val)
    : obj + val;
};

/**
 * Map the given `prop`.
 */

exports.map = function(arr, prop){
  return arr.map(function(obj){
    return obj[prop];
  });
};

/**
 * 反序对象
 */

exports.reverse = function(obj){
  return Array.isArray(obj)
    ? obj.reverse()
    : String(obj).split('').reverse().join('');
};

/**
 * 获取对象的属性值
 */

exports.get = function(obj, prop){
  return obj[prop];
};

/**
 * JSON序列化
 */
exports.json = function(obj){
  return JSON.stringify(obj);
};
