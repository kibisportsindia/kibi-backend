import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Request, Response, NextFunction } from "express";
import * as config from "../config/config.json";
import { Event } from "../models/Events";
import { Storage } from "@google-cloud/storage";
const formParser = require("../utils/formParser");
const MAX_SIZE = 4000000; // 4MB
const { v4: uuidv4 } = require('uuid')

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
  const formData = await formParser.parser(req, MAX_SIZE);
  const file = formData.files[0];
  console.log("formdata ", formData);
  console.log("file ", file);
  console.log("Buffer", file.content);
  try {
    if (!file) {
      res.status(400).send("Error, could not upload file ( file not found )");
      return;
    }
    const blob = bucket.file('image-' + uuidv4() + "-" + file.filename);
    const blobWriter = blob.createWriteStream({
      metadata: {
        contentType: file.contentType
      }
    });
    blobWriter.on("error", err => next(err));
    blobWriter.on("finish", async () => {
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${
        bucket.name
      }/o/${encodeURI(blob.name)}?alt=media`;

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
      res.status(200).send({ message: "Event added", id: newDoc.id });
    });
    blobWriter.end(file.content);
  } catch (error) {
    functions.logger.log("error:", error);
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
  const formData = await formParser.parser(req, MAX_SIZE);
  const file = formData.files[0];
  try {
    if (!file) {
      res.status(400).json({ message: "Error, file not found!" });
      return;
    }
    let id = formData["id"];
    console.log(id);
    db.collection(eventCollection)
      .doc(id)
      .get()
      .then(async doc => {
        let imageUrl = doc.data().image;
        const fileName = imageUrl.split("o/")[1].split("?")[0];
        console.log("fileName", fileName);
        const img = bucket.file(fileName);
        img.delete().then(result => {
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
            }/o/${encodeURI(blob.name)}?alt=media`;
            console.log(id);
            db.collection(eventCollection)
              .doc(id)
              .update({
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
              })
              .then(() => {
                res.status(200).json({ messgae: "Event Update Successfully" });
              })
              .catch(err => {
                console.log(1, err);
                res.status(400).json({ messgae: "Something Went Wrong!" });
              });
          });
          blobWriter.end(file.content);
        });
      })
      .catch(err => {
        console.log(1, err);
        res.status(400).json({ message: "Something went wrong!!" });
      });
  } catch (error) {
    console.log(1, error);
    res.status(400).send(`Something went wrong!!`);
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
        let imageUrl = doc.data().image;
        const fileName = imageUrl.split("o/")[1].split("?")[0];
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
