const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const router = express.Router();

const path = __dirname + '/views/';
const port = 8080;

const {get_readings, add_reading} = require('./db_connection.js');


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

router.use(function (req,res,next) {
  console.log('/' + req.method);
  next();
});

router.get('/', function(req,res){
  res.sendFile(path + 'index.html');
});

router.get('/sharks', function(req,res){
  console.log('getting sharks');
  res.sendFile(path + 'sharks.html');
});

app.get('/readings', (req, res) => {
  const readings = get_readings();

  res.send(readings);
});

app.get('/add-readings', (req, res) => {
  var pin = req.query.pin;
  var moisture = req.query.moisture;
  add_reading({pin, moisture});

  res.send({
    message: 'New reading was added successfully',
  });
});

app.post('/readings', (req, res) => {
  console.log('req:', req);
  var reading = req.body;
  add_reading(reading);

  res.send({
    message: 'New reading was added successfully',
  });
});

app.use(express.static(path));
app.use('/', router);

app.listen(port, function () {
  console.log('Example app listening on port 8080!')
})
