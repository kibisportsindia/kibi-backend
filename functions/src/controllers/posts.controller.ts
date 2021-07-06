import * as admin from "firebase-admin";
import * as config from "../config/config.json";
import { Storage } from "@google-cloud/storage";
import { Request, Response, NextFunction } from "express";
const formParser = require("../utils/formParser");
import {Post} from "../models/Post"
const { v4: uuidv4 } = require('uuid')
const MAX_SIZE = 4000000; // 4MB


export let db = admin.firestore();
const postCollection = "posts";

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
    console.log(files)
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
        imageUrls.push(publicUrl)
        if(imageUrls.length===noOfImages){
            let post:Post = {
                user_id:formData["user_id"],
                imageUrl:imageUrls,
                comment:[{commentId:"7",text:"",Timestamp:new Date}],
                likers:[],
                likesCount:0,
                description:formData["description"],
                Timestamp:new Date()
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
    //user_id==id of author
    try{
        const formData = await formParser.parser(req, MAX_SIZE);
        const user_id = formData["user_id"];
        console.log(user_id)
        await db.collection(postCollection).where("user_id","==",user_id).get().then(posts=>{
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
            res.status(200).json({posts:data})
            return;
        })
    }catch(error){
        console.log(error)
        return res.status(400).json({message:"Something Went Wrong!"})
    }
}


export let updatePost = async (
    req:Request,
    res:Response,
    next:NextFunction
) => {
    try{
        const formData = await formParser.parser(req, MAX_SIZE);
        const files = formData.files;
        let imageUrls = []
        if(!files.length){
            res.status(400).json({message:"File Not Found!"})
            return;
        }

        db.collection(postCollection).doc(formData["post_id"]).get().then(oldDoc=>{
            if(!oldDoc.exists){
                res.status(400).send({message:"POST not found!"})
                return;
            }
            let oldImageUrls = oldDoc.data().imageUrl;
            files.forEach(file=>{
                file.filename = uuidv4() + "-" + file.filename;
                const blob = bucket.file(file.filename);
                const blobWriter = blob.createWriteStream({
                metadata: {
                contentType: file.contentType
                    }
                })
                blobWriter.on("error", err => res.status(400).json({message:"Error in File Uploading"}));
    
                blobWriter.on("finish", async () => {
                    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURI(blob.name)}?alt=media`;
                    imageUrls.push(publicUrl)
                    if(imageUrls.length===files.length){
                        let post:Post = {
                            user_id:formData["user_id"],
                            imageUrl:imageUrls,
                            comment:[{commentId:"7",text:"",Timestamp:new Date}],
                            likers:[],
                            likesCount:0,
                            description:formData["description"],
                            Timestamp:new Date()
                        }
                        db.collection(postCollection).doc(formData["post_id"]).update(post).then(()=>{
                            res.status(200).json({message:"Post Update successfully!"});
                            oldImageUrls.forEach(url=>{
                                let imageName = url.split("o/")[1].split("?")[0];
                                console.log(imageName)
                                const img = bucket.file(imageName);
                                img.delete()
                            })
                            return;  
                        });
                    }
                })
                blobWriter.end(file.content); 
            })
        })
    }catch(error){
        console.log(error)
        return res.status(400).json({message:"Something went Wrong!"})
    }
    
}


export let deletePost = async (
    req:Request,
    res:Response,
    next:NextFunction
) => {
    const formData = await formParser.parser(req, MAX_SIZE);
    let postId = formData["postId"];
    await db.collection(postCollection).doc(postId).delete().then(()=>{
        res.status(200).json({message:"Post deleted successfully"})
        return;
    }).catch(error=>{
        console.log(error)
        return res.status(400).json({message:"Something went Wrong!"})
    })
}



export let likePost = async ( 
    req:Request,
    res:Response,
    next:NextFunction
) => {
   try{
        const formData = await formParser.parser(req, MAX_SIZE);
        const postId = formData["postId"];
        //here userId is the id of that user who is liking this post
        const userId = formData["userId"];
        db.collection(postCollection).doc(postId).get().then(doc=>{
            let docData = doc.data();
            if(docData.likers.includes(userId)){
                docData.likesCount = docData.likesCount-1;
                let userIndex = docData.likers.indexOf(userId);
                docData.likers.splice(userIndex,1)
            }else{
                docData.likesCount = docData.likesCount+1;
                docData.likers.push(userId)
            }
            console.log(docData);
            db.collection(postCollection).doc(postId).update({
                ...docData
            }).then(()=>{
                console.log("in then")
               res.status(200).send();
               return
            })
        })
    }catch(error){
        console.log(error)
        return res.status(400).json({message:"Something went Wrong!"})
    }
}