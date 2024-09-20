const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const bodyParser = require('body-parser');
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const router = express.Router();

const path = __dirname + '/dist/browser/';
const port = 8080;

const {get_readings, get_readings_paged, add_reading} = require('./db_connection.js');


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

router.use(function (req,res,next) {
  console.log('/' + req.method);
  next();
});

router.get('/', function(req,res){
  res.sendFile(path + 'index.html');
});

app.get('/readings', (req, res) => {
  const readings = get_readings();

  res.send(readings);
});
app.get('/readings-paged', (req, res) => {
  const limit = parseInt(req.query.limit);
  const offset = parseInt(req.query.offset);
  get_readings_paged(limit, offset).then(function(readings){
    res.send(readings);
  }).catch((err) => {res.send(err)});
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

io.on('connection', (socket) => {
  console.log('New client connected');

  setInterval(() => {
    const dataPoint = {
      timestamp: new Date(),
      value: Math.random() * 100 // Replace with your real data source
    };
    socket.emit('newDataPoint', dataPoint);
  }, 1000);

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(port, () => console.log(`Server running on port ${port}`));
