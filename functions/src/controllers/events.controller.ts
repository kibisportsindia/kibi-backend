import { Request, Response, NextFunction } from "express";
import * as config from "../config/config.json";
import { Event } from "../models/Events";
import { Storage } from "@google-cloud/storage";
import * as userController from "../controllers/users.controllers";
const formParser = require("../utils/formParser");
const MAX_SIZE = 4000000; // 4MB

let db = userController.db;
const eventCollection = "events";

const storage = new Storage({
  projectId: config.project_id,
  keyFilename: "../config/config.json"
});

const bucket = storage.bucket(`${config.project_id}.appspot.com`);

export const addEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const formData = await formParser.parser(req, MAX_SIZE);
  const file = formData.files[0];
  console.log("formdata ", formData);
  try {
    if (!file) {
      res.status(400).send("Error, could not upload file ( file not found )");
      return;
    }
    const blob = bucket.file(file.filename);
    const blobWriter = blob.createWriteStream({
      metadata: {
        contentType: file.contentType
      }
    });
    blobWriter.on("error", err => next(err));
    blobWriter.on("finish", async () => {
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${
        bucket.name
      }
              /o/${encodeURI(blob.name)}?alt=media`;

      console.log("url", publicUrl);
      const event: Event = {
        event_name: formData["event_name"],
        date: formData["date"],
        place: formData["place"],
        sports: formData["sports"],
        age_category: formData["age_category"],
        image: publicUrl,
        how_to_participate: formData["how_to_participate"],
        charges: formData["charges"],
        benefits: formData["benefits"],
        phone: formData["phone"],
        type: formData["type"]
      };
      console.log("event is ", event);
      const newDoc = await db.collection(eventCollection).add(event);
      res.status(200).send({ message: `Event added: ${newDoc.id}` });
    });
    blobWriter.end(formData.buffer);
  } catch (error) {
    console.log(error);
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
    let type = req.body["type"];
    await db
      .collection(eventCollection)
      .where("type", "==", type)
      .get()
      .then(eventData => {
        if (eventData.empty) {
          res.status(404).json({ message: "No Event Found" });
          return;
        }
        res.status(200).send(`events:${eventData}`);
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
  } catch (error) {}
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
      .delete()
      .then(() => {})
      .catch(error => {
        console.error("Error removing document: ", error);
      });
  } catch (error) {}
};
