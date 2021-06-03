import { Request, Response, NextFunction } from "express";
import * as config from "../config/config.json";
import { Event } from "../models/Events";
import { Storage } from "@google-cloud/storage";
import * as userController from "../controllers/users.controllers";

let db = userController.db;
const eventCollection = "events";

const storage = new Storage({
    projectId: config.project_id,
    keyFilename: "../config/config.json"
});

const bucket = storage.bucket(`${config.project_id}.appspot.com`);



export const addEvent = async (
    req: Request,
    res:Response,
    next:NextFunction
    ) => {
          console.log(req.body)
          try {
            if (!req.file) {
              res.status(400).send('Error, could not upload file ( file not found )');
              return;
            }
            const blob = bucket.file(req.file.originalname);
            const blobWriter = blob.createWriteStream({
              metadata: {
                contentType: req.file.mimetype,
              },
            });
            blobWriter.on('error', (err) => next(err));
            blobWriter.on('finish', async () => {
              const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}
              /o/${encodeURI(blob.name)}?alt=media`;
              const event: Event = {
                event_name: req.body["event_name"],
                date: req.body["date"],
                place: req.body["place"],
                sports: req.body["sports"],
                age_category: req.body["age_category"],
                image: publicUrl,
                how_to_participate:req.body["how_to_participate"],
                charges: req.body["charges"],
                benefits: req.body["benefits"],
                phone: req.body["phone"],
                type: req.body["type"]
              }
              const newDoc = await db.collection(eventCollection).add(event);
              res.status(200).send({message:`Event added: ${newDoc.id}`});
            });
            blobWriter.end(req.file.buffer);
          } catch (error) {
            res.status(400).send(`Something went wrong try again!!`);
            return;
          }       
}



export const getEvents = async (
  req: Request,
  res:Response,
  next:NextFunction
  ) => {
    try{
      let type= req.body["type"];
      await db.collection(eventCollection).where("type","==",type)
      .get().then(eventData=>{
        if (eventData.empty) {
          res.status(404).json({ message: "No Event Found" });
          return;
        }
        res.status(200).send(`events:${eventData}`)
      })
    }catch(err){
     res.status(400).send(`Something went wrong!!`);
     return;
    }
  }
    

export const updateEvent = async (
  req: Request,
  res:Response,
  next:NextFunction
) => {
  try{
    
  }catch(error){

  }
}


export const deleteEvent = async (
  req: Request,
  res:Response,
  next:NextFunction
) => {
  try{
    let id = req.body["event_id"];
    db.collection(eventCollection).doc(id).delete().then(() => {
     
  }).catch((error) => {
      console.error("Error removing document: ", error);
  });
    
  }catch(error){

  }
}

