# aTpl
JavaScript template

# Usage  

## 注释标签，不执行，也没有输出  

{{#  }}  

## 向模板输出值（带有转义）    

{{= value }}  

## 向模板输出没有转义的值  

{{- value }}  

## filter    

{{=: value | upcase }}   

    
## grammar   

{{ if(true) { }}   
	{{ console.log(true) }}  
{{ } }}   
    
# express-atpl     
     
```
var atpl = require('node-atpl');   
app.engine('.atpl', atpl.__express);   
app.set('view engine', 'atpl');   
   
// router   
app.get('/', function(req, res) {   
	var data = {};   
	res.render('index', data);   
});   
```    
    
# layoyt    
default value is 'views/layout/default.atpl'    
    
## render with default layout    
    
```    
app.get('/', function(req, res) {       
	var data = {};       
	res.render('index', data);    
	// render layout/default.atpl with index.atpl as `body`     
});       
```    
    
## render with special layout     
    
```    
app.get('/', function(req, res) {      
	res.render('index', {layout: 'layout/default'});       
});       
```    
    
## render with no layout    
    
```    
app.get('/', function(req, res) {      
	res.render('index', {layout: false});       
});       
```    
    
