import * as functions from "firebase-functions";
import * as bodyParser from "body-parser";
import * as admin from "firebase-admin";
import * as express from "express";
const cors = require("cors");
import { createServer } from "http";
import { Server } from "socket.io";
import * as io from "socket.io";

// Socket configuration
import WebSockets from "./utils/WebSockets";

//initialize firebase inorder to access its services

//initialize express server
const app = express();

//initialize the database and the collection
admin.initializeApp(functions.config().firebase);
//add the path to receive request and set json as bodyParser to process the body

app.use(bodyParser.json());
app.use(cors({ origin: true }));

app.use(bodyParser.urlencoded({ extended: false }));
app.use("/user", require("./routes/users.routes"));
app.use("/event", require("./routes/events.routes"));
app.use("/tutorials", require("./routes/tutorials.routes"));
app.use("/post", require("./routes/posts.routes"));
app.get("/heartbeat", (req, res) => {
  res.status(200).json(`Running`);
});

declare global {
  namespace NodeJS {
    interface Global {
      SocketServer: io.Server;
    }
  }
}

/** Create HTTP server. */
const server = createServer(app);

/** Create socket connection */
global.SocketServer = new Server(server);
global.SocketServer.on("connection", WebSockets.connection);

//define google cloud function name
exports.app = functions.https.onRequest(<any>server);
