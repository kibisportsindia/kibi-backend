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
  projectId: config.project_id,
  //keyFilename: "../config/config.json",
});

const bucket = storage.bucket(`${config.project_id}.appspot.com`);

export let addTutorial = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    db.collection(tutorialsCollection)
      .where("categoryNumber", "==", req.body["categoryNumber"])
      .get()
      .then(async (result) => {
        // console.log(result)
        if (!result.empty) {
          let oldData, id;
          result.forEach((doc) => {
            // console.log("doc: ",doc)
            id = doc.id;
            oldData = doc.data().data;
          });
          console.log(id, oldData);
          let newData;
          let tutorialId = suid();
          let data = {
            id: tutorialId,
            name: req.body["name"],
            description: req.body["description"],
            imageUrl: req.body.imageUrl,
            videoUrl: req.body.videoUrl,
            imageName: req.body["imageName"],
            videoName: req.body["imageName"],
          };
          newData = [...oldData, data];
          db.collection(tutorialsCollection)
            .doc(id)
            .update({
              data: newData,
            })
            .then((result) => {
              res.status(200).json({
                message: "Tutorial added",
                docId: id,
                tutorialId: tutorialId,
                imageName: req.body["imageName"],
                videoName: req.body["videoName"],
              });
            });
        } else {
          let tutorialId = suid();
          const tutorial: Tutorial = {
            categoryNumber: req.body["categoryNumber"],
            data: [
              {
                id: tutorialId,
                name: req.body["name"],
                description: req.body["description"],
                imageUrl: req.body.imageUrl,
                videoUrl: req.body.videoUrl,
                imageName: req.body.imageName,
                videoName: req.body.videoName,
              },
            ],
          };
          const newDoc = await db.collection(tutorialsCollection).add(tutorial);
          functions.logger.log("addTutorial:", {
            message: "tutorial added",
            docId: newDoc.id,
            tutorialId: tutorialId,
            imageName: req.body.imageName,
            videoName: req.body.videoName,
          });
          res.status(200).send({
            message: "tutorial added",
            docId: newDoc.id,
            tutorialId: tutorialId,
            imageName: req.body.imageName,
            videoName: req.body.videoName,
          });
        }
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
      .doc(req.query["docId"].toString())
      .get()
      .then((result) => {
        if (!result.exists) {
          res.status(400).json({ message: "Category Not Found" });
          return;
        }
        const doc = result.data();
        const docId = result.id;
        if (doc.data.length === 0) {
          res.status(200).json({ message: "No Tutorials Found" });
          return;
        }
        res.status(200).json({ docId: docId, tutorials: doc });
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
      .then(async (result) => {
        let oldData = result.data().data;
        console.log("oldData", oldData);
        let index = oldData.findIndex(
          (tutorial) => tutorial.id === req.body["tutorialId"]
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
          videoName: req.body.videoName,
        };
        db.collection(tutorialsCollection)
          .doc(req.body["docId"])
          .update({
            data: newData,
          })
          .then(() => {
            res.status(200).json({ message: "Tutorial update" });
          });
      })
      .catch((err) => {
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
      .then(async (result) => {
        if (result) {
          let oldData, id;
          id = result.id;
          oldData = result.data().data;
          let newData;
          let filesArray = [];
          console.log(oldData);
          newData = oldData.filter((item) => {
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
              data: newData,
            })
            .then((result) => {
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
    let tutorial = docData.data.filter((tut) => tut.id === tutorialId);
    res.status(200).send({ message: tutorial[0] });
  } catch (error) {
    console.log(error);
    res.status(400).send({ message: "something went wrong!" });
  }
};
