import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Request, Response, NextFunction } from "express";
import * as config from "../config/config.json";
import { Event } from "../models/Events";
import { Storage } from "@google-cloud/storage";
// const formParser = require("../utils/formParser");
// const MAX_SIZE = 4000000; // 4MB
//const { v4: uuidv4 } = require("uuid");

export let db = admin.firestore();
const eventCollection = "events";

const storage = new Storage({
  projectId: config.project_id
  // keyFilename: "./config/config.json"
});

const bucket = storage.bucket(`${config.project_id}.appspot.com`);

export const addEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    //console.log("url", publicUrl);
    const event: Event = {
      event_name: req.body["event_name"],
      date: req.body["date"],
      place: req.body["place"],
      sports: req.body["sports"],
      age_category: req.body["age_category"],
      image: req.body["imageUrl"],
      imageName: req.body["imageName"],
      how_to_participate: req.body["how_to_participate"],
      charges: req.body["charges"],
      benefits: req.body["benefits"],
      phone: req.body["phone"],
      type: req.body["type"]
    };
    console.log("event is ", event);
    const newDoc = await db.collection(eventCollection).add(event);
    functions.logger.log("addEvent:", {
      message: "Event added Successfully!",
      id: newDoc.id
    });
    res.status(200).send({ message: "Event added", id: newDoc.id });
  } catch (error) {
    functions.logger.log("addEvent:", error);
    res.status(400).send(`Something went wrong try again!!`);
    return;
  }
};

export const getEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("headers", req.headers);

    let type = req.headers.type;
    await db
      .collection(eventCollection)
      .where("type", "==", type)
      .get()
      .then(eventData => {
        if (eventData.empty) {
          res.status(404).json({ message: "No Event Found" });
          return;
        }

        let data = [];
        eventData.forEach(doc => {
          let id = doc.id;
          let docData = { id, ...doc.data() };
          data.push(docData);
        });
        console.log(data);
        res.status(200).json(data);
      });
  } catch (err) {
    console.log(err);
    res.status(400).send(`Something went wrong!!`);
    return;
  }
};

export const updateEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let id = req.body["id"];
    console.log(id);
    db.collection(eventCollection)
      .doc(id)
      .get()
      .then(async doc => {
        //let imageUrl = doc.data().image;

        console.log(id);
        db.collection(eventCollection)
          .doc(id)
          .update({
            event_name: req.body["event_name"],
            date: req.body["date"],
            place: req.body["place"],
            sports: req.body["sports"],
            age_category: req.body["age_category"],
            image: req.body["imageUrl"],
            how_to_participate: req.body["how_to_participate"],
            charges: req.body["charges"],
            benefits: req.body["benefits"],
            phone: req.body["phone"],
            type: req.body["type"],
            imageName: req.body["imageName"]
          })
          .then(() => {
            functions.logger.log("updateEvent:", {
              messgae: "Event Update Successfully"
            });
            res.status(200).json({ message: "Event Update Successfully" });
          })
          .catch(err => {
            console.log(1, err);
            functions.logger.log("updateEvent:", err);
            res
              .status(400)
              .json({ messgae: "Something Went Wrong! " + err.message });
          });
      })
      .catch(err => {
        console.log(1, err);
        functions.logger.log("updateEvent:", err);
        res
          .status(400)
          .json({ message: "Something went wrong!! " + err.message });
      });
  } catch (error) {
    console.log(1, error);
    functions.logger.log("updateEvent:", error);
    res.status(400).send(`Something went wrong!! ${error.message}`);
  }
};

export const deleteEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let id = req.body["event_id"];
    db.collection(eventCollection)
      .doc(id)
      .get()
      .then(async doc => {
        //let imageUrl = doc.data().image;
        const fileName = doc.data().imageName;
        console.log("fileName", fileName);
        await db
          .collection(eventCollection)
          .doc(id)
          .delete();
        const file = bucket.file(fileName);
        file
          .delete()
          .then(result => {
            res.status(200).json({ message: "Event Deleted Successfully" });
            console.log("FILE DELETED");
          })
          .catch(err => {
            res.status(400).json({ message: "Something went wrong!!" });
          });
      });
  } catch (error) {
    res.status(400).json({ message: "Something went wrong!!" });
  }
};
