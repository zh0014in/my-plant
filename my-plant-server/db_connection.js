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
    console.log("Result: " + JSON.stringify(result));
    con.end(function(err) {
      return result;
    });
  });
}

function get_readings_paged(limit, offset) {
  return new Promise(function(resolve, reject) {
    var con = connect();
    const params = [limit, offset];
    con.query("select * from readings LIMIT ? OFFSET ?", params, function (err, result) {
      if(err){
        handleError(err);
        return reject(err);
      }
      console.log("get_readings_paged result: " + JSON.stringify(result));
      con.end(function(err) {
        resolve(result);
      });
    });
  });
}

function get_readings_within(days) {
  return new Promise(function(resolve, reject) {
    var con = connect();
    let today = new Date();
    today.setDate(today.getDate() - days);
    let daysBackString = today.toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const params = [daysBackString];
    con.query("SELECT datetime, max(moisture) moisture, pin FROM `readings` WHERE datetime > ? group by left(datetime, 13), pin ORDER BY datetime ASC", params, function (err, result) {
      if(err){
        handleError(err);
        return reject(err);
      }
      console.log("get_readings_within result: " + JSON.stringify(result));
      con.end(function(err) {
        resolve(result);
      });
    });
  });
}

function get_pin_count(){
  return new Promise(function(resolve, reject){
    var con = connect();
    con.query("SELECT COUNT(DISTINCT pin) c FROM readings", function (err, result) {
      if(err){
        handleError(err);
        return reject(err);
      }
      console.log("get_pin_count result: " + JSON.stringify(result));
      con.end(function(err) {
        resolve(result);
      });
    });
  })
}

function add_reading(reading) {
  return new Promise(function(resolve, reject){
    var con = connect();
    var date = getDateTime();
    con.query(
      "insert into readings (pin, moisture, datetime) values (?, ?, ?)",
      [reading.pin, reading.moisture, date],
      function (err, result) {
        if(err){
          handleError(err);
          return reject(err);
        }
        console.log("add_reading result: " + JSON.stringify(result));
        con.end(function(err) {
          resolve(result);
        });
      }
    );
  })
}

function get_plants() {
  return new Promise(function(resolve, reject){
    var con = connect();
    con.query("select * from plants", function (err, result) {
      if(err){
        handleError(err);
        return reject(err);
      }
      console.log("get_plants result: " + JSON.stringify(result));
      con.end(function(err) {
        resolve(result);
      });
    });
  })

}

function add_plant(plant) {
  return new Promise(function(resolve, reject){
    var con = connect();
    con.query(
      "insert into plants (name, pin) values (?, ?)",
      [plant.name, plant.pin],
      function (err, result) {
        if(err){
          handleError(err);
          return reject(err);
        }
        console.log("add_plant result: " + JSON.stringify(result));
        con.end(function(err) {
          resolve(result);
        });
      }
    );
  })
}

function getDateTime(){
  var date = new Date();
  date.setHours(date.getHours() + 8);
  return date
}

module.exports = { get_readings, get_readings_paged, get_readings_within, get_pin_count, add_reading, get_plants, add_plant };
