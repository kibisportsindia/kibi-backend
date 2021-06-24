import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Request, Response, NextFunction } from "express";
import * as config from "../config/config.json";
import { Storage } from "@google-cloud/storage";
import {Tutorial} from "../models/tutorials"
const formParser = require("../utils/formParser");
const MAX_SIZE = 10000000; // 4MB
const { v4: uuidv4 } = require('uuid')
const ShortUniqueId = require('short-unique-id');

const suid = new ShortUniqueId();
admin.initializeApp(functions.config().firebase,"app-tutorials");
export let db = admin.firestore();

const tutorialsCollection = "tutorials";

const storage = new Storage({
  projectId: config.project_id,
  keyFilename: "../config/config.json"
});

const bucket = storage.bucket(`${config.project_id}.appspot.com`);




export let addTutorial = async (
    req:Request,
    res:Response,
    next:NextFunction
) => {
    try{
    let fileObj = {imageUrl:"",videoUrl:""};
    const formData = await formParser.parser(req, MAX_SIZE);
    // console.log(formData.files.length)
    if(formData.files.length<2){
        res.status(400).json({message:"File is missing"})
    }
    formData.files.forEach(file=>{
        if(file.fieldname==='image'){
            file.filename = 'image-' + uuidv4() + "-" + file.filename;
        }else{
            file.filename = 'video-' + uuidv4() + "-" + file.filename;
        }
        // console.log(file)
        const blob = bucket.file(file.filename);
        const blobWriter = blob.createWriteStream({
        metadata: {
        contentType: file.contentType
      }
    });
        blobWriter.on("error", err => next(err));
        blobWriter.on("finish", async () => {
            const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURI(blob.name)}?alt=media`;
            let fileType = publicUrl.split("o/")[1].split("?")[0].split('-')[0]
            console.log("filetype",fileType)
            if(fileType==='image'){
                fileObj.imageUrl = publicUrl;
            }else{
                fileObj.videoUrl = publicUrl;
            }
            if(fileObj.imageUrl.length !==0 && fileObj.videoUrl.length !==0){
                db.collection(tutorialsCollection).where("categoryNumber","==",formData["categoryNumber"]).get().then(async result=>{
                    // console.log(result)
                    if(!result.empty){
                        let oldData,id;
                        result.forEach(doc=>{
                        // console.log("doc: ",doc)
                            id = doc.id;
                            oldData = doc.data().data
                    })
                    console.log(id,oldData)
                    let newData;
                    let tutorialId = suid();
                    let newImageName =  fileObj.imageUrl.split("o/")[1].split("?")[0]
                    let newVideoName =  fileObj.videoUrl.split("o/")[1].split("?")[0]
                    let data = {
                        id:tutorialId,
                        name:formData["name"],
                        description:formData["description"],
                        imageUrl:fileObj.imageUrl,
                        videoUrl: fileObj.videoUrl,
                        imageName:newImageName,
                        videoName:newVideoName
                    }
                    newData = [...oldData,data]
                    db.collection(tutorialsCollection).doc(id).update({
                        data:newData
                    }).then(result=>{
                        res.status(200).json({
                        message:"Tutorial added",
                        docId:id,tutorialId:tutorialId,
                        imageName:newImageName,
                        videoName:newVideoName
                        })
                    })
                    }else{
                        let tutorialId = suid();
                        let newImageName =  fileObj.imageUrl.split("o/")[1].split("?")[0]
                        let newVideoName =  fileObj.videoUrl.split("o/")[1].split("?")[0]
                        const tutorial: Tutorial = {
                            categoryNumber:formData["categoryNumber"],
                            data:[{
                                id:tutorialId,
                                name:formData["name"],
                                description:formData["description"],
                                imageUrl:fileObj.imageUrl,
                                videoUrl:fileObj.videoUrl,
                                imageName:newImageName,
                                videoName:newVideoName
                            }]
                        }
                        const newDoc = await db.collection(tutorialsCollection).add(tutorial);
                        res.status(200).send({ 
                        message: "tutorial added", 
                        docId:newDoc.id,
                        tutorialId:tutorialId,
                        imageName:newImageName,
                        videoName:newVideoName});
                    }
                })
            }
    });
        blobWriter.end(file.content)
    })}catch(error){
        res.status(400).json({message:"Something went wrong!!"})
    }
}



export let getTutorials = async (
    req:Request,
    res:Response,
    next:NextFunction
) => {
    try{
        db.collection(tutorialsCollection).doc(req.query["docId"].toString()).get().then(result=>{
           if(!result.exists){
                res.status(400).json({message:"Category Not Found"})
                return;
           }
           const doc = result.data()
           const docId = result.id;
           if(doc.data.length === 0){
            res.status(200).json({message:"No Tutorials Found"})
            return;
           }
           res.status(200).json({docId:docId,tutorials:doc})
        })
    }catch(error){
        console.log(error)
        res.status(400).json({message:"Something went wrong!!"})
    }
}




export let updateTutorial = async ( 
    req:Request,
    res:Response,
    next:NextFunction
) => {
    try{
        let fileObj = {imageUrl:"",videoUrl:""};
        const formData = await formParser.parser(req, MAX_SIZE);
        // console.log(formData.files.length)
        if(formData.files.length<2){
        res.status(400).json({message:"File is missing"})
        }
        let filesObj = {image:{content:Buffer,filename:"",contentType:String},
        video:{content:Buffer,filename:"",contentType:String}};
        
        formData.files.forEach(file=>{
            if(file.fieldname === 'video'){
                filesObj.video = file
            }else{
                filesObj.image = file
            }
        })

        console.log("filesObj",filesObj)
        console.log(filesObj.video.filename)
        console.log(formData["videoName"])
        
        if(filesObj.video.filename === formData["videoName"]){
            console.log("BLOCK if")
            let newImageName = 'image-' + uuidv4() + "-" + filesObj.image.filename
            const blob = bucket.file(newImageName);
            const blobWriter = blob.createWriteStream({
            metadata: {
            contentType: filesObj.image.contentType
            }})
            blobWriter.on("error", err => next(err));
            blobWriter.on("finish", async () => {
                const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/
                ${encodeURI(blob.name)}?alt=media`;
                const videoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/
                ${filesObj.video.filename}?alt=media`;
                bucket.file(formData["imageName"]).delete().then(()=>{})
                db.collection(tutorialsCollection)
                    .doc(formData["docId"])
                    .get()
                    .then(async result=>{
                        let oldData = result.data().data;
                        let index = oldData.findIndex(tutorial=> tutorial.id === formData["tutorialId"])
                        let newData = [...oldData]
                        newData[index] = {
                            id:oldData[index].id,
                            name:formData["name"],
                            description:formData["description"],
                            imageUrl:imageUrl,
                            videoUrl:videoUrl,
                            imageName:newImageName,
                            videoName:filesObj.video.filename
                        }
                        db.collection(tutorialsCollection).doc(formData["docId"]).update({
                            data:newData
                        }).then(()=>{
                            res.status(200).json({message:"Tutorial update"})
                        })
                    }).catch(err=>{
                        console.log("error in if",err )
                        res.status(400).json({message:"Something went wrong!!"})
                    })
                })
            blobWriter.end(filesObj.image.content)
        }else{
                formData.files.forEach(file=>{         
                    if(file.fieldname==='image'){
                        file.filename = 'image-' + uuidv4() + "-" + file.filename;
                    }else{
                        file.filename = 'video-' + uuidv4() + "-" + file.filename;
                    }
                    // file.filename = uuidv4() + "-" + file.filename;
                    // console.log(file)
                    const blob = bucket.file(file.filename);
                    const blobWriter = blob.createWriteStream({
                    metadata: {
                    contentType: file.contentType
                  }
                });
                    blobWriter.on("error", err => next(err));
                    blobWriter.on("finish", async () => {
                        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURI(blob.name)}?alt=media`;
                        let fileType = publicUrl.split("o/")[1].split("?")[0].split('-')[0]
                        console.log("filetype",fileType)
                        if(fileType==='image'){
                            fileObj.imageUrl = publicUrl;
                        }else{
                            fileObj.videoUrl = publicUrl;
                        }
                        // console.log(fileObj)
                        if(fileObj.imageUrl.length !==0 && fileObj.videoUrl.length !==0){
                            db.collection(tutorialsCollection)
                            .doc(formData["docId"])
                            .get()
                            .then(async result=>{
                                let oldData = result.data().data;
                                console.log("oldData",oldData)
                                let index = oldData.findIndex(tutorial=> tutorial.id === formData["tutorialId"])
                                console.log("index",index)
                                let newData = [...oldData]
                                newData[index] = {
                                    id:oldData[index].id,
                                    name:formData["name"],
                                    description:formData["description"],
                                    imageUrl:fileObj.imageUrl,
                                    videoUrl:fileObj.videoUrl,
                                    imageName:fileObj.imageUrl.split("o/")[1].split("?")[0],
                                    videoName:fileObj.videoUrl.split("o/")[1].split("?")[0]
                                }
                                db.collection(tutorialsCollection).doc(formData["docId"]).update({
                                    data:newData
                                }).then(()=>{
                                    bucket.file(formData["imageName"]).delete().then(()=>{})
                                bucket.file(formData["videoName"]).delete().then(()=>{}) 
                                    res.status(200).json({message:"Tutorial update"})
                                })
                            }).catch(err=>{
                                console.log("error in else",err)
                                res.status(400).json({message:"Something went wrong!!"})
                            })
                        }
                });
                    blobWriter.end(file.content)
                })
            }
    }catch(error){
        console.log(error)
        res.status(400).json({message:"Something went wrong!!"})
    }       
}




export let deleteTutorial = (
    req:Request,
    res:Response,
    next:NextFunction
) => {
    try{
        db.collection(tutorialsCollection)
        .doc(req.body["docId"])
        .get()
        .then(async result=>{
            if(result){
                let oldData,id;
                id = result.id;
                oldData = result.data().data
                let newData;
                let filesArray = [];
                console.log(oldData)
                newData = oldData.filter(item=>{
                    if(item.id !== req.body["tutorialId"]){
                        return item;
                    }else{
                        filesArray.push(item.imageUrl.split("o/")[1].split("?")[0],
                        item.videoUrl.split("o/")[1].split("?")[0])
                    }
                })
                db.collection(tutorialsCollection).doc(id).update({
                    data:newData
                }).then(result=>{
                    bucket.file(filesArray[0]).delete().then(()=>{
                        bucket.file(filesArray[1]).delete().then(()=>{
                            res.status(200).json({message:"Tutorial Deleted Successfully"})
                        })
                    })
                })
            }else{
                res.status(400).json({message:"No Document Found of such category"})
            }
        })
    }catch(error){
        console.log(error)
        res.status(400).json({message:"Something went wrong!!"})
    }
}








