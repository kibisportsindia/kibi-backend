import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
// import * as config from "../config/config.json";
// import { Storage } from "@google-cloud/storage";
import { Post } from "../models/Post";
//const formParser = require("../utils/formParser");
//const { v4: uuidv4 } = require("uuid");
//const MAX_SIZE = 4000000; // 4MB
//const axios = require("axios");
// const ShortUniqueId = require("short-unique-id");

// const suid = new ShortUniqueId();

export let db = admin.firestore();
const postCollection = "posts";
const homeFeedCollection = "homeFeed";
const userCollection = "users";
const SharedPostCollection = "SharedPost";
const postCommentsCollection = "postComments";
// const storage = new Storage({
//   projectId: config.project_id
//   // keyFilename: "./config/config.json"
// });

// const bucket = storage.bucket(`${config.project_id}.appspot.com`);

// let pushNotifications = async (notificationBody) => {
//   let axiosConfig = {
//     headers: {
//       Authorization: `key=${config.fcmServerKey}`,
//       "Content-Type": "application/json",
//     },
//   };
//   let url = "https://fcm.googleapis.com/fcm/send";
//   let data = notificationBody;
//   try {
//     await axios.post(url, data, axiosConfig);
//   } catch (error) {
//     console.log(error);
//   }
// };

export let createPost = async (req, res, next) => {
  try {
    let post: Post = {
      user_id: req.user.id,
      imageUrl: req.body.imageUrls,
      likers: [],
      likesCount: 0,
      description: req.body["description"],
      Timestamp: new Date(),
    };
    const newDoc = await db.collection(postCollection).add(post);
    const newId = newDoc.id;
    res
      .status(200)
      .json({ message: "Post created successfully!", id: newDoc.id });

    //For homeFeed
    const userDoc = await db.collection("users").doc(req.user.id).get();
    const userConnectionsId = userDoc.data().connections;
    await db
      .collection(homeFeedCollection)
      .doc(req.user.id)
      .collection("feed")
      .doc(newId)
      .set({
        ...post,
      });
    userConnectionsId.forEach((id) => {
      db.collection(homeFeedCollection)
        .doc(id)
        .collection("feed")
        .doc(newId)
        .set({
          ...post,
        });
    });
    return;
  } catch (error) {
    console.log(error);
    functions.logger.log("createPost(Error)", error);
    return res.status(400).json({ message: "Something Went Wrong!" });
  }
};

export let getPosts = async (req, res, next) => {
  //user_id==id of author
  try {
    //const formData = await formParser.parser(req, MAX_SIZE);
    const user_id = req.user.id;
    console.log(user_id);
    await db
      .collection(postCollection)
      .where("user_id", "==", user_id)
      .get()
      .then((posts) => {
        if (posts.empty) {
          res.status(200).json({ message: "No Post Found" });
          return;
        }
        let data = [];
        posts.forEach((doc) => {
          let id = doc.id;
          let docData = { id, ...doc.data() };
          data.push(docData);
        });
        res.status(200).json({ posts: data });
        return;
      });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Something Went Wrong!" });
  }
};

export let updatePost = async (req, res, next) => {
  try {
    db.collection(postCollection)
      .doc(req.body["post_id"])
      .get()
      .then((oldDoc) => {
        if (!oldDoc.exists) {
          res.status(400).send({ message: "POST not found!" });
          return;
        }

        let post: Post = {
          user_id: req.user.id,
          imageUrl: req.body["imageUrls"],
          likers: [],
          likesCount: 0,
          description: req.body["description"],
          Timestamp: new Date(),
        };
        db.collection(postCollection)
          .doc(req.body["post_id"])
          .update(post)
          .then(async () => {
            res.status(200).json({ message: "Post Update successfully!" });
            // oldImageUrls.forEach((url) => {
            //   let imageName = url.split("o/")[1].split("?")[0];
            //   console.log(imageName);
            //   const img = bucket.file(imageName);
            //   img.delete();
            // });

            //feed update

            const userDoc = await db.collection("users").doc(req.user.id).get();
            const userConnectionsId = userDoc.data().connections;
            await db
              .collection(homeFeedCollection)
              .doc(req.user.id)
              .collection("feed")
              .doc(req.body["post_id"])
              .update({
                ...post,
              });
            userConnectionsId.forEach(async (id) => {
              await db
                .collection(homeFeedCollection)
                .doc(id)
                .collection("feed")
                .doc(req.body["post_id"])
                .update({
                  ...post,
                });

              let sharePost = await db
                .collection(SharedPostCollection)
                .doc(id)
                .collection("posts")
                .where("postId", "==", req.body["post_id"])
                .get();

              if (!sharePost.empty) {
                sharePost.forEach(async (doc) => {
                  const userDoc = await db
                    .collection(userCollection)
                    .doc(id)
                    .get();
                  const userData = userDoc.data();

                  await db
                    .collection(homeFeedCollection)
                    .doc(id)
                    .collection("feed")
                    .doc(doc.id)
                    .update({ ...post });
                  userData.connections.forEach(async (id) => {
                    console.log(id);
                    await db
                      .collection(homeFeedCollection)
                      .doc(id)
                      .collection("feed")
                      .doc(doc.id)
                      .update({ ...post });
                  });
                  await doc.ref.update({ ...post });
                });
              }
            });
            return;
          });
      });
  } catch (error) {
    console.log(error);
    functions.logger.log("updatePost(Error)", error);
    return res.status(400).json({ message: "Something went Wrong!" });
  }
};

export let deletePost = async (req, res, next) => {
  //const formData = await formParser.parser(req, MAX_SIZE);
  let postId = req.body["postId"];
  const authorId = (
    await db.collection(postCollection).doc(postId).get()
  ).data().user_id;
  if (authorId === req.user.id) {
    await db
      .collection(postCollection)
      .doc(postId)
      .delete()
      .then(async () => {
        res.status(200).json({ message: "Post deleted successfully" });

        const userDoc = await db.collection("users").doc(req.user.id).get();
        const userConnectionsId = userDoc.data().connections;
        await db
          .collection(homeFeedCollection)
          .doc(req.user.id)
          .collection("feed")
          .doc(postId)
          .delete();
        // let sharePostDoc = await db
        //   .collection(homeFeedCollection)
        //   .doc(req.user.id)
        //   .collection("feed")
        //   .where("postId", "==", postId)
        //   .get();
        // if (!sharePostDoc.empty) {
        //   sharePostDoc.forEach((doc) => doc.ref.delete());
        // }
        console.log("userConnectionsId", userConnectionsId);
        userConnectionsId.forEach(async (id) => {
          console.log(id);
          await db
            .collection(homeFeedCollection)
            .doc(id)
            .collection("feed")
            .doc(postId)
            .delete();

          let sharePost = await db
            .collection(SharedPostCollection)
            .doc(id)
            .collection("posts")
            .where("postId", "==", postId)
            .get();

          console.log("sharePost.empty", sharePost.empty);
          if (!sharePost.empty) {
            sharePost.forEach(async (doc) => {
              const userDoc = await db.collection(userCollection).doc(id).get();
              const userData = userDoc.data();
              doc.ref.delete();
              await db
                .collection(homeFeedCollection)
                .doc(id)
                .collection("feed")
                .doc(doc.id)
                .delete();

              await userData.connections.forEach((id) => {
                console.log(id);
                db.collection(homeFeedCollection)
                  .doc(id)
                  .collection("feed")
                  .doc(doc.id)
                  .delete();
              });
            });
          }
        });
        return;
      })
      .catch((error) => {
        console.log(error);
        return res.status(400).json({ message: "Something went Wrong!" });
      });
  } else {
    return res
      .status(400)
      .json({ message: "You are not authorized to Delete this Post!!" });
  }
};

export let likePost = async (req, res, next) => {
  try {
    const postId = req.body["postId"];
    //here userId is the id of that user who is liking this post
    const userId = req.user.id;
    db.collection(postCollection)
      .doc(postId)
      .get()
      .then(async (doc) => {
        let docData = doc.data();
        const likersId = docData.likers.map((obj) => obj.userId);
        if (likersId.includes(userId)) {
          docData.likesCount = docData.likesCount - 1;
          let userIndex = likersId.indexOf(userId);
          docData.likers.splice(userIndex, 1);
        } else {
          docData.likesCount = docData.likesCount + 1;
          const userSnap = await db
            .collection(userCollection)
            .doc(userId)
            .get();
          const userData = userSnap.data();
          docData.likers.push({
            userId: userId,
            userName: userData.name,
            userRole: userData.role,
            userImageUrl: userData.imageUrl,
          });
        }
        console.log(docData);
        db.collection(postCollection)
          .doc(postId)
          .update({
            ...docData,
          })
          .then(async () => {
            console.log("in then");
            db.collection(homeFeedCollection)
              .doc(docData.user_id)
              .collection("feed")
              .doc(postId)
              .update({ ...docData });
            const userSnap = await db
              .collection(userCollection)
              .doc(docData.user_id)
              .get();
            const userConnections = userSnap.data().connections;
            userConnections.forEach((id) => {
              db.collection(homeFeedCollection)
                .doc(id)
                .collection("feed")
                .doc(postId)
                .update({ ...docData });
            });
            res.status(200).send();
            return;
          });
      });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Something went Wrong!" });
  }
};

export let commentOnPost = async (req, res, next) => {
  const postId = req.body["postId"];
  const text = req.body["text"];
  console.log(req.body);
  db.collection("users")
    .doc(req.user.id)
    .get()
    .then((userDocSnap) => {
      if (!userDocSnap.exists) {
        res.status(400).send({ message: "user dont exist!" });
        return;
      }
      let userData = userDocSnap.data();
      db.collection(postCollection)
        .doc(postId)
        .get()
        .then(async (docSnap) => {
          const sharedPostSnap = await db
            .collection(SharedPostCollection)
            .doc()
            .get();
          if (!docSnap.exists || !sharedPostSnap.exists) {
            res.status(400).send({ message: "Post dont exist!" });
            return;
          }
          //let docData = docSnap.data();
          let comment = {
            userId: req.user.id,
            userName: userData.name,
            userImageUrl: userData.imageUrl,
            //commentId: suid(),
            text: text,
            Timestamp: new Date(),
          };
          //docData.comment.push(comment);
          db.collection(postCommentsCollection)
            .doc(postId)
            .collection("comments")
            .add({
              comment,
            })
            .then((result) => {
              res
                .status(200)
                .send({ message: "comment added!", commentId: result.id });
              return;
            })
            .catch((error) => {
              console.log(error);
              return res.status(400).json({ message: "Something went Wrong!" });
            });
        })
        .catch((error) => {
          console.log(error);
          return res.status(400).json({ message: "Something went Wrong!" });
        });
    });
};

export let deleteComment = async (req, res, next) => {
  let postId = req.body["postId"];
  let commentId = req.body["commentId"];
  const postSnap = await db.collection(postCollection).doc(postId).get();
  const sharedPostSnap = await db.collection(SharedPostCollection).doc().get();
  if (!postSnap.exists || !sharedPostSnap.exists) {
    res.status(400).send({ message: "Post not Found!" });
    return;
  }
  await db
    .collection(postCommentsCollection)
    .doc(postId)
    .collection("comments")
    .doc(commentId)
    .delete();
  res.status(200).send({ message: "Comment Deleted Successfully!" });
  return;
};

export let replyOnComment = async (req, res, next) => {
  const postId = req.body["postId"];
  const postSnap = await db.collection(postCollection).doc(postId).get();
  const sharedPost = await db.collection(SharedPostCollection).doc().get();
  if (!postSnap.exists || !sharedPost.exists) {
    res.status(400).send({ message: "Post not Found!" });
    return;
  }
  const commentId = req.body["commentId"];
  const commentSnap = await db
    .collection(postCommentsCollection)
    .doc(postId)
    .collection("comments")
    .doc(commentId)
    .get();
  if (!commentSnap.exists) {
    res.status(400).send({ message: "Comment not Found!" });
    return;
  }
  const text = req.body["text"];
  if (!text.length) {
    res.status(400).send({ message: "Please add some text!" });
    return;
  }
  const userSnap = await db.collection(userCollection).doc(req.user.id).get();
  const userData = userSnap.data();
  await db
    .collection(postCollection)
    .doc(postId)
    .collection("comments")
    .doc(commentId)
    .collection("replies")
    .add({
      userId: req.user.id,
      userName: userData.name,
      userImageUrl: userData.imageUrl,
      //commentId: suid(),
      text: text,
      Timestamp: new Date(),
    });
  await db
    .collection(postCollection)
    .doc(postId)
    .collection("comments")
    .doc(commentId)
    .set({ haveReplies: true });
  res.status(200).send({ message: "reply added" });
};

export let getCommentsByPostId = async (req, res, next) => {
  const loggedInUserId = req.user.id;
  const page = req.query.page;
  const docId = req.query.lastDocId;
  let commentPerReq = 10;
  console.log(page);
  console.log(loggedInUserId);

  let docSnap;

  if (page === "1") {
    console.log("in if");
    docSnap = await db
      .collection(postCommentsCollection)
      .doc(req.body["postId"])
      .collection("comments")
      .orderBy("Timestamp", "desc")
      .limit(commentPerReq)
      .get();
  } else {
    let lastSnap = await db
      .collection(postCommentsCollection)
      .doc(req.body["postId"])
      .collection("comments")
      .doc(docId)
      .get();
    docSnap = await db
      .collection(postCommentsCollection)
      .doc(req.body["postId"])
      .collection("comments")
      .orderBy("Timestamp", "desc")
      .startAfter(lastSnap)
      .limit(commentPerReq)
      .get();
  }

  console.log(docSnap.empty);
  const comments = [];
  let index = 0;
  docSnap.forEach((doc) => {
    comments.push(doc.data());
    comments[index++].id = doc.id;
  });
  let lastDocId;
  if (!docSnap.empty) {
    lastDocId = docSnap.docs[docSnap.docs.length - 1].id;
  }
  res.status(200).send({ feedPosts: comments, lastDocId: lastDocId });
  return;
};

export let getCommentReplies = async (req, res, next) => {
  const loggedInUserId = req.user.id;
  const page = req.query.page;
  const docId = req.query.lastDocId;
  let commentRepliesPerReq = 10;
  let commentId = req.body.commentId;
  console.log(page);
  console.log(loggedInUserId);

  let docSnap;

  if (page === "1") {
    console.log("in if");
    docSnap = await db
      .collection(postCommentsCollection)
      .doc(req.body["postId"])
      .collection("comments")
      .doc(commentId)
      .collection("replies")
      .orderBy("Timestamp", "desc")
      .limit(commentRepliesPerReq)
      .get();
  } else {
    let lastSnap = await db
      .collection(postCommentsCollection)
      .doc(req.body["postId"])
      .collection("comments")
      .doc(commentId)
      .collection("replies")
      .doc(docId)
      .get();
    docSnap = await db
      .collection(postCommentsCollection)
      .doc(req.body["postId"])
      .collection("comments")
      .doc(commentId)
      .collection("replies")
      .orderBy("Timestamp", "desc")
      .startAfter(lastSnap)
      .limit(commentRepliesPerReq)
      .get();
  }

  console.log(docSnap.empty);
  const replies = [];
  let index = 0;
  docSnap.forEach((doc) => {
    replies.push(doc.data());
    replies[index++].id = doc.id;
  });
  let lastDocId;
  if (!docSnap.empty) {
    lastDocId = docSnap.docs[docSnap.docs.length - 1].id;
  }
  res.status(200).send({ feedPosts: replies, lastDocId: lastDocId });
  return;
};

export let addSharePost = async (req, res, next) => {
  try {
    //const formData = await formParser.parser(req, MAX_SIZE);
    console.log(req.user.id);
    const userDoc = await db.collection(userCollection).doc(req.user.id).get();
    const userData = userDoc.data();
    const sharedPostDoc = await db
      .collection(SharedPostCollection)
      .doc(req.user.id)
      .collection("posts")
      .add({
        ...req.body,
        sharedBy: userData.name,
        sharedByImageUrl: userData.imageUrl,
        timestamp: new Date(),
        likers: [],
        likesCount: 0,
      });

    console.log("sharedPostDoc.id", sharedPostDoc.id);
    res.status(200).send({ message: "Post Shared Successfully!!" });
    db.collection(homeFeedCollection)
      .doc(req.user.id)
      .collection("feed")
      .doc(sharedPostDoc.id)
      .set({
        ...req.body,
        sharedBy: userData.name,
        sharedByImageUrl: userData.imageUrl,
        timestamp: new Date(),
        likers: [],
        likesCount: 0,
      });

    userData.connections.forEach((id) => {
      console.log(id);
      db.collection(homeFeedCollection)
        .doc(id)
        .collection("feed")
        .doc(sharedPostDoc.id)
        .set({
          ...req.body,
          sharedBy: userData.name,
          sharedByImageUrl: userData.imageUrl,
          timestamp: new Date(),
          likers: [],
          likesCount: 0,
        });
    });
    return;
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Something went Wrong!" });
  }
};

export let deleteSharedPost = async (req, res, next) => {
  try {
    const docRef = await db
      .collection(SharedPostCollection)
      .doc(req.user.id)
      .collection("posts")
      .doc(req.body.postId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      res.status(400).send({ message: "Post not Found!" });
      return;
    }
    await docRef.delete();
    res.status(200).send({ message: "Post Deleted Successfully!!" });
    const userDoc = await db.collection(userCollection).doc(req.user.id).get();
    const userData = userDoc.data();

    await db
      .collection(homeFeedCollection)
      .doc(req.user.id)
      .collection("feed")
      .doc(req.body.postId)
      .delete();

    await userData.connections.forEach((id) => {
      console.log(id);
      db.collection(homeFeedCollection)
        .doc(id)
        .collection("feed")
        .doc(req.body.postId)
        .delete();
    });

    return;
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Something went Wrong!" });
  }
};

// export let sendNotificationToTokenInstances = async () => {
//   let messageBody = {
//     fcm_tokens: Array,
//     data: Array,
//     notification: { title: String, body: String },
//     customer_id: String,
//   };
//   let message = {
//     priority: "high",
//     tokens: messageBody.fcm_tokens,
//     data: messageBody.data,
//     apns: {
//       headers: {
//         "apns-priority": "10",
//       },
//       payload: {
//         aps: {
//           alert: messageBody.notification,
//           data: messageBody.data,
//         },
//       },
//     },
//     webpush: {
//       headers: {
//         Urgency: "high",
//       },
//       data: messageBody.data,
//       notification: {
//         title: messageBody.notification.title,
//         body: messageBody.notification.body,
//         requireInteraction: false,
//         // badge: "/badge-icon.png",
//         data: messageBody.data,
//       },
//     },
//   };

//   console.log("~~~~~~~~~~");
//   console.log(message);
//   console.log("~~~~~~~~~~");

//   return admin
//     .messaging()
//     .sendMulticast(message)
//     .then(async (response) => {
//       console.log("response " + response);
//       let logMessage = {
//         CUSTOMER_ID: messageBody.customer_id,
//         FIREBASE_RESPONSE: JSON.stringify(response),
//         PAYLOAD: messageBody,
//       };
//       //logger.logResponse(logMessage, context);
//     });
// };
// export let test = async (req,res,next) => {
//   console.log("begg")
//   let post = {
//     user_id: "Latest",
//     imageUrl: "Latest",
//     comment: [],
//     likers: [],
//     likesCount: 0,
//     description: "Latest",
//     Timestamp: new Date()
//   };
//   const newDoc = await db.collection(postCollection).add(post);
//   const newId = newDoc.id;
//   console.log("before")
//   res.status(200)
//     .json({ message: "Post created successfully!", id: newDoc.id });
//   console.log("after")
//   const userDoc = await db.collection("users").doc("CG3ziaR6LTpOyRtaeLXR").get();
//   console.log(userDoc.exists)
//   console.log(userDoc.data())
//   const userConnectionsId = userDoc.data().connections;
//   await db.collection(homeFeedCollection).doc("CG3ziaR6LTpOyRtaeLXR").collection("feed").doc(newId).set({
//     ...post
//   })
//   userConnectionsId.forEach(id=>{
//     db.collection("feed").doc(id).collection("feed").doc(newId).set({
//       ...post
//     })
//     console.log(id)
//   })
//   return;
// }
