var express = require('express');
var app = express();
var http = require('http').Server(app);
var bodyParser=require('body-parser');
var jsonParser = bodyParser.json();

var uemDuplicateCheck = require('../Model/uemDuplicateCheck');

var port = 1337;
var allowCORS = function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  res.header("Access-Control-Allow-Headers", "X-Requested-With,Origin,Content-Type, Accept");
  next();
};


app.use(bodyParser.urlencoded({ extended: false }));
app.use(allowCORS);
uemDuplicateCheck.userSocketManage(http);

app.get('/requestProject',uemDuplicateCheck.requestProject);

app.get('/acceptProject',uemDuplicateCheck.acceptProject);

app.post('/uemDuplicateCheck', jsonParser, uemDuplicateCheck.uemDuplicateCheck);

app.post('/skillCheck',jsonParser,uemDuplicateCheck.skillCheck);

app.post('/userEmailConfirm',jsonParser,uemDuplicateCheck.userEmailConfirm);

http.listen(port, function(){
  console.log('listening on *: '+port);
});

//http POST 127.0.0.1:1337/uemDuplicateCheck sknm=cobb@a.com Accept:application/json Content-Type:application/json
