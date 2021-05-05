import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as bodyParser from "body-parser";
import * as express from "express";
const cors = require("cors");

//initialize firebase inorder to access its services
admin.initializeApp(functions.config().firebase);

//initialize express server
const app = express();
const main = express();

//initialize the database and the collection

//add the path to receive request and set json as bodyParser to process the body
main.use("/api/v1", app);
main.use(bodyParser.json());
main.use(cors({ origin: true }));
main.use(bodyParser.urlencoded({ extended: false }));

//define google cloud function name
export const webApi = functions.https.onRequest(main);
