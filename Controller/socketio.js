var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mysql = require('../MetaData/mysqlPool');
var pool = mysql.pool;

var port = 1338;

var users=[];

var getUserSocketId = function(uno){
  var userSocket;
  for (var i=0; i < users.length; i++) {
    var user = users[i];
    if (user.uno == uno) {
      userSocket=users[i];
      break;
    }
  }
  return userSocket.socketId;
}

var userDuplicateCheck = function(uno){
  var check=true;
  for (var i=0; i < users.length; i++) {
    var user = users[i];
    if (user.uno == uno) {
      check=false;
    }
  }
  return check;
}

app.get('/requestProject',function(req,res){
  pool.getConnection(function(err, connection){
    var SQL = ` SELECT user.uno, user.unm, pjt.cpjno, pjt.cpjnm
                FROM CPJTS pjt, CINFOS cinfo, USERS user
                WHERE pjt.cno = cinfo.cno
                AND cinfo.uno = user.uno
                AND cpjno =?`;
    connection.query(SQL,req.param('cpjno'),function(err, rows, fields) {
        if (err) throw err;
        var notificationReceiver = rows[0].uno;
        rows[0].uno=req.param('uno');
        console.log(rows[0].uno+" is send requestProject notification to "+notificationReceiver);
        io.sockets.in(getUserSocketId(notificationReceiver)).emit('requestProjectNotification',rows[0]);
        connection.release();
        res.end();
    });
  });
});

app.get('/acceptProject',function(req,res){
  pool.getConnection(function(err, connection){
    var SQL = ` SELECT pjt.cpjnm, cpjjoin.uno, pjt.cpjno
                FROM CPJJOIN cpjjoin, CPJTS pjt
                WHERE cpjjoin.cpjno=pjt.cpjno
                AND cpjjoin.cpjno=?
                AND uno=?`;
    connection.query(SQL,[req.param('cpjno'),req.param('uno')],function(err, rows, fields) {
      if (err) throw err;
      var notificationReceiver = rows[0].uno;
      console.log("send "+rows[0].cpjno+" Project's acceptProject notification to "+rows[0].uno);
      io.sockets.in(getUserSocketId(notificationReceiver)).emit('acceptProjectNotification',rows[0]);
      connection.release();
      res.end();
    });
  });
});

io.sockets.on('connection', function(socket){

  socket.on('login', function(data){
    console.log(data.uno + " is Login");
    var userInfo = new Object();
    userInfo.uno=data.uno;
    userInfo.socketId = socket.id;
    if(userDuplicateCheck(data.uno)){
      users.push(userInfo);
    }
    console.log("current Login User ->");
    console.log(users);
  });

  socket.on('disconnect', function() {
    for (var i=0; i < users.length; i++) {
      var user = users[i];
      if (user.socketId == socket.id) {
          console.log(users[i].uno + " is disconnected");
          users.splice(i, 1);
          console.log("current Login User ->");
          console.log(users);
          break;
      }
    }
  });
});

http.listen(port, function(){
  console.log('listening on *: '+port);
});