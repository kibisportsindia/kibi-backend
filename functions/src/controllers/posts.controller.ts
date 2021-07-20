import * as admin from "firebase-admin";
import * as config from "../config/config.json";
import { Storage } from "@google-cloud/storage";
const formParser = require("../utils/formParser");
import { Post } from "../models/Post";
const { v4: uuidv4 } = require("uuid");
const MAX_SIZE = 4000000; // 4MB
const ShortUniqueId = require("short-unique-id");

const suid = new ShortUniqueId();

export let db = admin.firestore();
const postCollection = "posts";
const homeFeedCollection = "homeFeed";
const userCollection = "users";
const SharedPostCollection = "SharedPost";

const storage = new Storage({
  projectId: config.project_id,
  // keyFilename: "./config/config.json"
});

const bucket = storage.bucket(`${config.project_id}.appspot.com`);

export let createPost = async (req, res, next) => {
  try {
    const formData = await formParser.parser(req, MAX_SIZE);
    const files = formData.files;
    console.log(files);
    const noOfImages = files.length;
    const imageUrls = [];

    if (!files.length) {
      return res.status(400).json({ message: "File Not Found" });
    }
    formData.files.forEach((file) => {
      file.filename = uuidv4() + "-" + file.filename;
      // console.log(file)
      const blob = bucket.file(file.filename);
      const blobWriter = blob.createWriteStream({
        metadata: {
          contentType: file.contentType,
        },
      });
      blobWriter.on("error", (err) =>
        res.status(400).json({ message: "Error in File Uploading" })
      );
      blobWriter.on("finish", async () => {
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${
          bucket.name
        }/o/${encodeURI(blob.name)}?alt=media`;
        imageUrls.push(publicUrl);
        if (imageUrls.length === noOfImages) {
          let post: Post = {
            user_id: req.user.id,
            imageUrl: imageUrls,
            comment: [],
            likers: [],
            likesCount: 0,
            description: formData["description"],
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
        }
      });
      blobWriter.end(file.content);
    });
  } catch (error) {
    console.log(error);
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
    const formData = await formParser.parser(req, MAX_SIZE);
    const files = formData.files;
    let imageUrls = [];
    if (!files.length) {
      res.status(400).json({ message: "File Not Found!" });
      return;
    }

    db.collection(postCollection)
      .doc(formData["post_id"])
      .get()
      .then((oldDoc) => {
        if (!oldDoc.exists) {
          res.status(400).send({ message: "POST not found!" });
          return;
        }
        let oldImageUrls = oldDoc.data().imageUrl;
        files.forEach((file) => {
          file.filename = uuidv4() + "-" + file.filename;
          const blob = bucket.file(file.filename);
          const blobWriter = blob.createWriteStream({
            metadata: {
              contentType: file.contentType,
            },
          });
          blobWriter.on("error", (err) =>
            res.status(400).json({ message: "Error in File Uploading" })
          );

          blobWriter.on("finish", async () => {
            const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${
              bucket.name
            }/o/${encodeURI(blob.name)}?alt=media`;
            imageUrls.push(publicUrl);
            if (imageUrls.length === files.length) {
              let post: Post = {
                user_id: req.user.id,
                imageUrl: imageUrls,
                comment: [],
                likers: [],
                likesCount: 0,
                description: formData["description"],
                Timestamp: new Date(),
              };
              db.collection(postCollection)
                .doc(formData["post_id"])
                .update(post)
                .then(async () => {
                  res
                    .status(200)
                    .json({ message: "Post Update successfully!" });
                  oldImageUrls.forEach((url) => {
                    let imageName = url.split("o/")[1].split("?")[0];
                    console.log(imageName);
                    const img = bucket.file(imageName);
                    img.delete();
                  });

                  //feed update

                  const userDoc = await db
                    .collection("users")
                    .doc(req.user.id)
                    .get();
                  const userConnectionsId = userDoc.data().connections;
                  await db
                    .collection("feed")
                    .doc(req.user.id)
                    .collection("feed")
                    .doc(formData["post_id"])
                    .update({
                      post,
                    });
                  userConnectionsId.forEach(async (id) => {
                    await db
                      .collection("feed")
                      .doc(id)
                      .collection("feed")
                      .doc(formData["post_id"])
                      .update({
                        post,
                      });

                    let sharePost = await db
                      .collection(SharedPostCollection)
                      .doc(id)
                      .collection("posts")
                      .where("postId", "==", formData["post_id"])
                      .get();

                    if (!sharePost.empty) {
                      sharePost.forEach(async (doc) => {
                        const userDoc = await db
                          .collection(userCollection)
                          .doc(id)
                          .get();
                        const userData = userDoc.data();

                        await db
                          .collection("feed")
                          .doc(id)
                          .collection("feed")
                          .doc(doc.id)
                          .update({ ...post });
                        userData.connections.forEach(async (id) => {
                          console.log(id);
                          await db
                            .collection("feed")
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
            }
          });
          blobWriter.end(file.content);
        });
      });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Something went Wrong!" });
  }
};

export let deletePost = async (req, res, next) => {
  const formData = await formParser.parser(req, MAX_SIZE);
  let postId = formData["postId"];
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
            .collection("feed")
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
                .collection("feed")
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
    const formData = await formParser.parser(req, MAX_SIZE);
    const postId = formData["postId"];
    //here userId is the id of that user who is liking this post
    const userId = req.user.id;
    db.collection(postCollection)
      .doc(postId)
      .get()
      .then((doc) => {
        let docData = doc.data();
        if (docData.likers.includes(userId)) {
          docData.likesCount = docData.likesCount - 1;
          let userIndex = docData.likers.indexOf(userId);
          docData.likers.splice(userIndex, 1);
        } else {
          docData.likesCount = docData.likesCount + 1;
          docData.likers.push(userId);
        }
        console.log(docData);
        db.collection(postCollection)
          .doc(postId)
          .update({
            ...docData,
          })
          .then(() => {
            console.log("in then");
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
        .then((docSnap) => {
          if (!docSnap.exists) {
            res.status(400).send({ message: "user dont exist!" });
            return;
          }
          let docData = docSnap.data();
          let comment = {
            userId: req!.user.id,
            userName: userData.name,
            commentId: suid(),
            text: text,
            Timestamp: new Date(),
          };
          docData.comment.push(comment);
          db.collection(postCollection)
            .doc(postId)
            .update({
              ...docData,
            })
            .then((result) => {
              res.status(200).send({ message: "comment added!" });
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

export let deleteComment = (req, res, next) => {
  let postId = req.body["postId"];
  let commentId = req.body["commentId"];
  db.collection(postCollection)
    .doc(postId)
    .get()
    .then((docSnap) => {
      let docData = docSnap.data();
      if (docData.userId !== req.user.id) {
        res
          .status(401)
          .send({ message: "You are not authorized to delete this comment!" });
      }
      docData.comment = docData.comment.filter(
        (comment) => comment.commentId !== commentId
      );
      db.collection(postCollection)
        .doc(postId)
        .update({
          ...docData,
        })
        .then((result) => {
          res.status(200).send({ message: "Comment Deleted" });
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
};

export let replyOnComment = (req, res, next) => {
  const postId = req.body["postId"];
  const commentId = req.body["commentId"];
  const text = req.body["text"];
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
        .then((docSnap) => {
          let docData = docSnap.data();
          console.log(docData);
          docData.comment = docData.comment.map((comment) => {
            if (comment.commentId === commentId) {
              if (!comment.replies) {
                comment.replies = [];
              }
              comment.replies.push({
                userId: req.user.id,
                userName: userData.name,
                commentId: suid(),
                text: text,
                Timestamp: new Date(),
              });
              return comment;
            } else {
              return comment;
            }
          });
          console.log(docData);
          db.collection(postCollection)
            .doc(postId)
            .update({
              ...docData,
            })
            .then((result) => {
              res.status(200).send({ message: "reply added" });
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
        comment: [],
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
        comment: [],
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
          comment: [],
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
      .collection("feed")
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

// export let test = async (req, res, next) => {
//   try {
//     let f = { description: "for aaa" };
//     const doc = await db.collection("posts").where("aa", "==", "aaa").get();
//     console.log(doc.empty);
//     doc.forEach((a) => a.ref.update({ f }));
//   } catch (error) {
//     console.log(error);
//   }
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
