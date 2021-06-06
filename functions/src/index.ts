import * as functions from "firebase-functions";
import * as bodyParser from "body-parser";
import * as express from "express";
const cors = require("cors");
import * as multer from "multer";
//initialize firebase inorder to access its services

//initialize express server
const app = express();

//initialize the database and the collection

//add the path to receive request and set json as bodyParser to process the body

app.use(multer({ storage: multer.memoryStorage() }).single("image"));
app.use(bodyParser.json());
app.use(cors({ origin: true }));

app.use(bodyParser.urlencoded({ extended: false }));
app.use("/user", require("./routes/users.routes"));
app.use("/event", require("./routes/events.routes"));
app.get("/heartbeat", (req, res) => {
  res.status(200).json(`Running`);
});
//define google cloud function name
exports.app = functions.https.onRequest(app);
