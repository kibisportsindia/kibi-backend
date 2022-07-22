import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Request, Response, NextFunction } from "express";
import * as config from "../config/config.json";
import { Storage } from "@google-cloud/storage";
import { Tutorial } from "../models/tutorials";
// const formParser = require("../utils/formParser");
// const MAX_SIZE = 10000000; // 4MB
// const { v4: uuidv4 } = require("uuid");
const ShortUniqueId = require("short-unique-id");

const suid = new ShortUniqueId();
admin.initializeApp(functions.config().firebase, "app-tutorials");
export let db = admin.firestore();

const tutorialsCollection = "tutorials";

const storage = new Storage({
  projectId: config.project_id
  //keyFilename: "../config/config.json",
});

const bucket = storage.bucket(`${config.project_id}.appspot.com`);

export let addTutorial = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let tutorialId = suid();
    const tutorial: Tutorial = {
      id: tutorialId,
      name: req.body["name"],
      description: req.body["description"],
      videoUrl: req.body.videoUrl,
      approved: false
    };

    const newDoc = await db.collection(tutorialsCollection).add(tutorial);
    functions.logger.log("addTutorial:", {
      message: "tutorial added",
      docId: newDoc.id,
      tutorialId: tutorialId
    });
    res.status(200).send({
      message: "tutorial added",
      docId: newDoc.id,
      tutorialId: tutorialId,
      name: req.body.name,
      description: req.body.description,
      videoUrl: req.body.videoUrl
    });
  } catch (error) {
    functions.logger.log("addTutorial:", error);
    res.status(400).json({ message: "Something went wrong!!" });
  }
};

export let getTutorials = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    db.collection(tutorialsCollection)
      .get()
      .then(result => {
        if (result.empty) {
          res.status(400).json({ message: "Tutorials Not Found" });
          return;
        }
        let data = [];
        result.forEach(doc => {
          let id = doc.id;
          let docData = { id, ...doc.data() };
          data.push(docData);
        });
        console.log(data);
        res.status(200).json(data);
      });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Something went wrong!!" });
  }
};

export let updateTutorial = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    db.collection(tutorialsCollection)
      .doc(req.body["docId"])
      .get()
      .then(async result => {
        let oldData = result.data().data;
        console.log("oldData", oldData);
        let index = oldData.findIndex(
          tutorial => tutorial.id === req.body["tutorialId"]
        );
        console.log("index", index);
        let newData = [...oldData];
        newData[index] = {
          id: oldData[index].id,
          name: req.body["name"],
          description: req.body["description"],
          imageUrl: req.body.imageUrl,
          videoUrl: req.body.videoUrl,
          imageName: req.body.imageName,
          videoName: req.body.videoName
        };
        db.collection(tutorialsCollection)
          .doc(req.body["docId"])
          .update({
            data: newData
          })
          .then(() => {
            res.status(200).json({ message: "Tutorial update" });
          });
      })
      .catch(err => {
        console.log("error in else", err);
        functions.logger.log("updateTutorial:", { error: "err" });
        res.status(400).json({ message: "Something went wrong!!" });
      });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Something went wrong!!" });
  }
};

export let deleteTutorial = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    db.collection(tutorialsCollection)
      .doc(req.body["docId"])
      .get()
      .then(async result => {
        if (result) {
          let oldData, id;
          id = result.id;
          oldData = result.data().data;
          let newData;
          let filesArray = [];
          console.log(oldData);
          newData = oldData.filter(item => {
            if (item.id !== req.body["tutorialId"]) {
              return item;
            } else {
              filesArray.push(
                item.imageUrl.split("o/")[1].split("?")[0],
                item.videoUrl.split("o/")[1].split("?")[0]
              );
            }
          });
          db.collection(tutorialsCollection)
            .doc(id)
            .update({
              data: newData
            })
            .then(result => {
              bucket
                .file(filesArray[0])
                .delete()
                .then(() => {
                  bucket
                    .file(filesArray[1])
                    .delete()
                    .then(() => {
                      res
                        .status(200)
                        .json({ message: "Tutorial Deleted Successfully" });
                    });
                });
            });
        } else {
          res
            .status(400)
            .json({ message: "No Document Found of such category" });
        }
      });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Something went wrong!!" });
  }
};

export let getATutorialById = async (req, res, next) => {
  try {
    const categoryNumber = req.query.categoryNumber;
    const tutorialId = req.query.tutorialId;
    const docSnap = await db
      .collection(tutorialsCollection)
      .where("categoryNumber", "==", categoryNumber)
      .get();
    const docData = docSnap.docs[0].data();
    let tutorial = docData.data.filter(tut => tut.id === tutorialId);
    res.status(200).send({ message: tutorial[0] });
  } catch (error) {
    console.log(error);
    res.status(400).send({ message: "something went wrong!" });
  }
};
