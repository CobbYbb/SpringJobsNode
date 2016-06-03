var mysql = require('../MetaData/mysqlPool');
var pool = mysql.pool;
var nodemailer = require('nodemailer');
var io;


var transporter = nodemailer.createTransport('smtps://aws.yucobb@gmail.com:fbqtddrnbhgagvdu@smtp.gmail.com');

var users=[];

function convertMailOptions(email,uno) {
	return{
    		from: '"SpringJobs" <admin@springjobs.com>',
    		to: email,
    		subject: 'SpringJobs 계정 확인 메일입니다.',
    		html: '안녕하세요 SpringJobs 입니다.'+
    		'계정확인메일입니다. 아래의 링크를 클릭해주세요.<br>'+
    		'<a href="http://bitcobb.chickenkiller.com:8080/view/common/userEmailConfirm/userEmailConfirm.html?uno='+uno+'">SpringJobs 계정 인증하기</a>'
	}
};

var getUserSocketId = function(uno){
  var userSocket;
  for (var i=0; i < users.length; i++) {
    var user = users[i];
    if (user.uno == uno) {
      userSocket=users[i];
      break;
    }
  }
  if(userSocket.socketId){
  	return userSocket.socketId;
  }else{
  	return null;
  }
}

var checkUser = function(uno){
	var bool=false;
	for (var i=0; i < users.length; i++) {
		var user = users[i];
		if (user.uno == uno) {
	      bool=true;
	      break;
	    }
	}
	return bool;
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

exports.requestProject = function(req,res){
  pool.getConnection(function(err, connection){
    var SQL = ` SELECT user.uno, (select unm from USERS where uno=?)unm, pjt.cpjno, pjt.cpjnm
                FROM CPJTS pjt, CINFOS cinfo, USERS user
                WHERE pjt.cno = cinfo.cno
                AND cinfo.uno = user.uno
                AND cpjno =?`;
    connection.query(SQL,[req.param('uno'),req.param('cpjno')],function(err, rows, fields) {
        if (err) throw err;
        var notificationReceiver = rows[0].uno;
        insertJoinProjectNotify(rows[0]);
        var responseData = JSON.parse(JSON.stringify(rows[0]));
        responseData.uno=req.param('uno');
        console.log(responseData.uno+" is send requestProject notification to "+notificationReceiver);
        if(checkUser(notificationReceiver)){
        	io.sockets.in(getUserSocketId(notificationReceiver)).emit('requestProjectNotification',responseData);
        }
        connection.release();
    	res.end();
    });
  });
}

var insertJoinProjectNotify = function(result){
	pool.getConnection(function(err, connection){
		SQL = `	insert into UNOTIFY values
			(0,'company','프로젝트 신청',?,
			?,'0',now(),?)`;
	    connection.query(SQL,[	result.unm+'님이 "'+result.cpjnm+'" 프로젝트에 참여신청을 하셨습니다.',
	    						'/view/company/getProjectView/getProjectView.html?cpjno='+result.cpjno,
	    						result.uno]
	    	,function(err, rows, fields) {	
	    		if (err) throw err;
	    		connection.release();
	    	}
	    );
	});
}

exports.acceptProject = function(req,res){
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
	    if(checkUser(notificationReceiver)){
	    	io.sockets.in(getUserSocketId(notificationReceiver)).emit('acceptProjectNotification',rows[0]);
	    }
	    insertConfirmProjectNotify(rows[0]);
      	connection.release();
    	res.end();
    });
  });
}

var insertConfirmProjectNotify = function(result){
	console.log(result);
	pool.getConnection(function(err, connection){
		SQL = `	insert into UNOTIFY values
			(0,'developer','프로젝트 수락',?,
			?,'0',now(),?)`;
	    connection.query(SQL,[	'"'+result.cpjnm+'" 프로젝트 신청이 수락되었습니다..',
	    						'/view/company/getProjectView/getProjectView.html?cpjno='+result.cpjno,
	    						result.uno]
	    	,function(err, rows, fields) {	
	    		if (err) throw err;
	    		connection.release();
	    	}
	    );
	});
}

exports.userSocketManage = function(http){
  	io=require('socket.io')(http);
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
}




exports.uemDuplicateCheck =  function(req,res){
	if(req.accepts('application/json')){
		pool.getConnection(function(err, connection){
			connection.query('SELECT count(*) as duplicateResult FROM USERS where uem=?',req.body.uem,
				function(err, rows, fields) {
				if (err) throw err;
				console.log(rows[0]);
				res.json(rows[0]);
				connection.release();
			});
		});
	}
}

exports.skillCheck = function(req,res){
	console.log("result : "+req.body);
	if(req.accepts('application/json')){
		pool.getConnection(function(err, connection){
			connection.query('SELECT * FROM SKILLS WHERE SKNM like ?',req.body.sknm+"%",
				function(err, rows, fields) {
				if (err) throw err;
				console.log(rows);
				res.json(rows);
				connection.release();
			});
		});
	}
}


exports.userEmailConfirm = function(req,res){
	var mailOptions = convertMailOptions(req.body.uem, req.body.uno);
	console.log(mailOptions);
	transporter.sendMail(mailOptions, function(error, info){
	    if(error){
	        return console.log(error);
	    }
	    console.log('Message sent: ' + info.response);
	});
	res.end();
}
