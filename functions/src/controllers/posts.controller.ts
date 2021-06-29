import * as admin from "firebase-admin";
import * as config from "../config/config.json";
import { Storage } from "@google-cloud/storage";
import { Request, Response, NextFunction } from "express";
const formParser = require("../utils/formParser");
import {Post} from "../models/Post"
const { v4: uuidv4 } = require('uuid')
const MAX_SIZE = 4000000; // 4MB


export let db = admin.firestore();
const postCollection = "collection";

const storage = new Storage({
  projectId: config.project_id
  // keyFilename: "./config/config.json"
});

const bucket = storage.bucket(`${config.project_id}.appspot.com`);


export let createPost = async ( 
    req:Request,
    res:Response,
    next:NextFunction
) => {
    try{
    const formData = await formParser.parser(req, MAX_SIZE);
    const files = formData.files;
    const noOfImages = files.length;
    const imageUrls = []

    if(!files.length){
        return res.status(400).json({message:"File Not Found"})
    }
    formData.files.forEach(file=>{
        file.filename = uuidv4() + "-" + file.filename;
        // console.log(file)
        const blob = bucket.file(file.filename);
        const blobWriter = blob.createWriteStream({
        metadata: {
        contentType: file.contentType
        }

    })
    blobWriter.on("error", err => res.status(400).json({message:"Error in File Uploading"}));
    blobWriter.on("finish", async () => {
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURI(blob.name)}?alt=media`;
        // imageUrls.push(publicUrl)
        if(imageUrls.length===noOfImages){
            let post = {
                user_id:formData["user_id"],
                imageUrl:publicUrl,
                comment:[],
                commentId:7,
                likers:[],
                likesCount:7,
                description:formData["description"],
            }
            const newDoc = await db.collection(postCollection).add(post);
            return res.status(200).json({message:"Post created successfully!",id:newDoc.id})
           
        }
    })
    blobWriter.end(file.content)
    });
    }catch(error){
        console.log(error)
        return res.status(400).json({message:"Something Went Wrong!"})
    }
}


export let getPosts = async(
    req:Request,
    res:Response,
    next:NextFunction
) => {
    const user_id = req.body["user_id"];
    await db.collection(postCollection).where("uyser_id","==",user_id).get().then(posts=>{
        if(posts.empty){
            res.status(200).json({message:"No Post Found"})
            return;
        }
        let data = []
        posts.forEach(doc => {
          let id = doc.id;
          let docData = { id, ...doc.data() };
          data.push(docData);
        });
        res.status(200).json({message:"Post Created",posts:data})
        return;
    })
}



export let updatePost = async (
    req:Request,
    res:Response,
    next:NextFunction
) => {
    try{
        const formData = await formParser.parser(req, MAX_SIZE);
        if(!formData.files){
            res.status(400).json({message:"Image Not FOUND!"})
            return;
        }
        if(formData.files[0].filename === formData["filename"]){
            const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${formData.files[0].filename}?alt=media`
            db.collection(postCollection).doc(req.body["postId"]).update({
                user_id:formData["user_id"],
                imageUrl:publicUrl,
                comment:[],
                commentId:7,
                likers:[],
                likesCount:7,
                description:formData["description"],
            }).then(() => {
                res.status(200).json({ messgae: "Post Update Successfully" });
              })
              .catch(err => {
                console.log(err);
                res.status(400).json({ messgae: "Something Went Wrong!" });
              });
        }else{
            const files = formData.files;
            const noOfImages = files.length;
            const imageUrls = []

            if(!files.length){
                return res.status(400).json({message:"File Not Found"})
            }
            formData.files.forEach(file=>{
                file.filename = uuidv4() + "-" + file.filename;
                // console.log(file)
                const blob = bucket.file(file.filename);
                const blobWriter = blob.createWriteStream({
                metadata: {
                contentType: file.contentType
                }

            })
            blobWriter.on("error", err => res.status(400).json({message:"Error in File Uploading"}));
            blobWriter.on("finish", async () => {
                const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURI(blob.name)}?alt=media`;
                // imageUrls.push(publicUrl)
                bucket.file(formData["filename"]).delete().then(()=>{})
                if(imageUrls.length===noOfImages){
                    let post = {
                        user_id:formData["user_id"],
                        imageUrl:publicUrl,
                        comment:[],
                        commentId:7,
                        likers:[],
                        likesCount:7,
                        description:formData["description"],
                    }
                    const newDoc = await db.collection(postCollection).add(post);
                    return res.status(200).json({message:"Post created successfully!",id:newDoc.id})          
        }
    })
    blobWriter.end(file.content)
    });
        }
    }catch(error){

    }
}


export let deletePost = async (
    req:Request,
    res:Response,
    next:NextFunction
) => {
    let postId = req.body["postId"];
    await db.collection(postCollection).doc(postId).delete().then(()=>{
        res.status(200).json({message:"Post deleted successfully"})
        return;
    }).catch(err=>{
        console.log(err)
        return res.status(200).json({message:"Something went Wrong!"})
    })
}