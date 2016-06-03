var mysql = require('mysql');
exports.pool = mysql.createPool({
  host     : 'localhost',
  user     : 'root',
  password : 'you278112!',
  database : 'test',
  connectionLimit:10,
  waitForConnections:true
});