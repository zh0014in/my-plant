var mysql = require('mysql');
const config = require('./config');

const connectdb = () => {
  var con = mysql.createConnection({
    host: config.host,
    user: config.user,
    password: config.password
  });

  con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
  });

}

module.exports = {connectdb};
