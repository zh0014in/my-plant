const express = require("express");
var cors = require("cors");
const http = require("http");
const socketIO = require("socket.io");
const bodyParser = require("body-parser");
const events = require("events");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: ["http://localhost:4200", "http://192.168.1.131:8081"],
    methods: ["GET", "POST"],
  },
});
const router = express.Router();

const path = __dirname + "/dist/browser/";
const port = 8080;

const {
  get_readings,
  get_readings_paged,
  get_readings_within,
  get_pin_count,
  add_reading,
  get_plants,
  add_plant,
} = require("./db_connection.js");
const eventEmitter = new events.EventEmitter();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

router.use(function (req, res, next) {
  console.log("/" + req.method);
  next();
});

router.get("/", function (req, res) {
  res.sendFile(path + "index.html");
});

app.get("/readings", (req, res) => {
  const readings = get_readings();

  res.send(readings);
});
app.get("/readings-paged", (req, res) => {
  const limit = parseInt(req.query.limit);
  const offset = parseInt(req.query.offset);
  get_readings_paged(limit, offset)
    .then(function (readings) {
      res.send(readings);
    })
    .catch((err) => {
      res.send(err);
    });
});
app.get("/pin-count", (req, res) => {
  get_pin_count().then(function (count) {
    res.send(count);
  });
});

app.get("/add-readings", (req, res) => {
  var pin = req.query.pin;
  var moisture = req.query.moisture;
  add_reading({ pin, moisture }).then(function () {
    const dataPoint = {
      datetime: new Date(),
      moisture: parseInt(moisture),
      pin: parseInt(pin),
    };
    eventEmitter.emit("data_received", dataPoint);

    res.send({
      message: "New reading was added successfully",
    });
  });
});
app.get("/plants", (req, res) => {
  get_plants().then(function (plants) {
    res.send(plants);
  });
});
app.post("/plants", (req, res) => {
  const plant = req.body;
  add_plant(plant).then(function () {
    res.send({
      message: "New plant was added successfully",
    });
  });
});

app.use(express.static(path));
app.use("/", router);

io.on("connection", (socket) => {
  console.log("New client connected");

  get_readings_within(2).then(function (readings) {
    socket.emit("initialData", readings);
  });

  eventEmitter.on("data_received", function (dataPoint) {
    socket.emit("newDataPoint", dataPoint);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

server.listen(port, () => console.log(`Server running on port ${port}`));
