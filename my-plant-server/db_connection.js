var mysql = require("mysql");
const config = require("./config");

function handleError(error) {
  if (error) {
    console.error("Error connecting to MySQL database:", error);
  } else {
    console.log("Connected to MySQL database!");
  }
}

function connect() {
  console.log("host:", config.db.host);
  console.log("user:", config.db.user);
  console.log("password:", config.db.password);
  console.log("name:", config.db.name);
  var con = mysql.createConnection({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
  });
  return con;
}

function get_readings() {
  var con = connect();
  con.query("select * from readings", function (err, result) {
    handleError(err);
    console.log("Result: " + result);
    con.end(function(err) {
      return result;
    });

  });
}

function add_reading(reading) {
  console.log('adding reading:', reading)
  var con = connect();
  var date = getDateTime();
  con.query(
    "insert into readings (pin, moisture, datetime) values (?, ?, ?)",
    [reading.pin, reading.moisture, date],
    function (err, result) {
      handleError(err);
      console.log("Result: " + result);
      con.end(function(err) {
        return result;
      });
    }
  );
}

function getDateTime(){
  var date = new Date();
  date.setHours(date.getHours() + 8);
  return date
}

module.exports = { get_readings, add_reading };
