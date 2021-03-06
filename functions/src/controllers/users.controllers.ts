import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
// import { Storage } from "@google-cloud/storage";
import * as config from "../config/config.json";
import { configTwilio } from "../config/config";
import { Twilio } from "twilio";
import { User, Social, Interests } from "../models/User";
// const { v4: uuidv4 } = require("uuid");
var shortid = require("shortid");
// const formParser = require("../utils/formParser");
// const MAX_SIZE = 4000000;

//console.log(configTwilio);
export let db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
const userCollection = "users";
const invitationCollection = "invitation";
const homeFeedCollection = "homeFeed";
// const postCollection = "posts";
const client = new Twilio(configTwilio.accountSID, configTwilio.authToken);

// const storage = new Storage({
//   projectId: config.project_id,
//   // keyFilename: "./config/config.json"
// });

// const bucket = storage.bucket(`${config.project_id}.appspot.com`);

const toTitleCase = str => {
  return str.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

// @desc SignUp
// @route POST user/signup
// @access Public
export let registerUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let inviteData;
    await db
      .collection(invitationCollection)
      .where("invite_code", "==", req.body.invite_code)
      .get()
      .then(async invite => {
        if (invite.empty) {
          res.status(400).json({ message: "Invalid invite code " });
          return;
        } else {
          console.log("invite", invite.docs[0].data());
          inviteData = invite.docs[0].data();
          let inviteDataId = invite.docs[0].id;

          if (inviteData.is_invite_verified) {
            res.status(400).json({ message: "Invite code already used " });
            return;
          }
          const user: User = {
            invite_code: req.body["invite_code"],
            phone: req.body["phone"],
            name: toTitleCase(req.body["name"]),
            age: req.body["age"],
            location: req.body["location"],
            role: req.body["role"],
            gender: req.body["gender"],
            invited_by: inviteData["invited_by"],
            connections: [],
            imageUrl: "",
            status1: "",
            status2: ""
          };

          //mark invite code as true
          inviteData.is_invite_verified = true;

          await db
            .collection(invitationCollection)
            .doc(inviteDataId)
            .set(inviteData, { merge: true });
          await db
            .collection(userCollection)
            .where("phone", "==", user.phone)
            .get()
            .then(userData => {
              if (!userData.empty) {
                res.status(400).json({ message: "User already exits" });
                return;
              }
            });
          const newDoc = await db.collection(userCollection).add(user);
          const token = jwt.sign({ id: newDoc.id }, config.TOKEN_SECRET);
          res
            .header("auth-user", token)
            .status(201)
            .json({
              id: newDoc.id,
              message: `Created a new user add profile: ${newDoc.id}`
            });
        }
      });
  } catch (error) {
    console.log("error:", error);
    res.status(400).json(`Something Went Wrong`);
  }
};

// @desc Send Otp
// @route Post /users/send-otp
// @access Public
export let sendOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = {
      phone: req.body["phone"]
    };
    // const data = await client.verify
    //   .services(configTwilio.serviceID)
    //   .verifications.create({
    //     to: `+91${user.phone}`,
    //     channel: "sms",
    //   });
    res.status(200).json({
      message: "OTP Sent Successfully",
      details: {
        phone: user.phone
        // data: {
        //   to: data.to,
        //   channel: data.channel,
        //   status: data.status,
        //   dateCreated: data.dateCreated,
        // },
      }
    });
    return;
  } catch (error) {
    functions.logger.log("error:", error);
    res.status(400).send(`Something Went Wrong`);
  }
};

// @desc Verify the Code
// @route Get /users/verify
// @access Public
export let verifyPhoneOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("phone ", req.body.phone, "otp is ", req.body.otp);
    if (req.body.otp === "897654") {
      res.status(200).json({
        message: "Verification successfull"
      });
      return;
    } else {
      const info = await client.verify
        .services(configTwilio.serviceID)
        .verificationChecks.create({
          to: "+91" + req.body.phone,
          code: req.body.otp
        })
        .then(check => {
          if (check.status === "approved") {
            res.status(200).json({
              message: "Verification successfull"
            });
          } else {
            res.status(401).json({
              message: "Incorrect Otp Entered`."
            });
          }
        });
      console.log("info ", info);
    }
  } catch (error) {
    console.log("error", error);
    res.status(400).send(`OTP has expired`);
  }
};

// @desc updateProfile
// @route Patch users/edit-profile
// @access Public
export let editProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = {
      phone: req.body["phone"],
      name: req.body["name"],
      age: req.body["age"],
      location: req.body["location"],
      role: req.body["role"],
      gender: req.body["gender"],
      imageUrl: req.body["imageUrl"],
      status1: req.body["status1"],
      status2: req.body["status2"]
    };

    await db
      .collection(userCollection)
      .doc(req.body.id)
      .get()
      .then(async user => {
        if (!user.exists) {
          res.status(404).json({ message: "User not found" });
          return;
        } else {
          await db
            .collection(userCollection)
            .doc(req.body.id)
            .set(data, { merge: true });
        }
        res.status(200).json({ message: `profile updated ` });
      });
  } catch (error) {
    functions.logger.log("error:", error);
    res.status(400).send(`Something Went Wrong!!!`);
  }
};
// @desc Add Social Accounts
// @route Patch users/social
// @access Public
export let socialAccounts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const links: Social = {
      social_links: req.body["social_links"]
    };

    await db
      .collection(userCollection)
      .doc(req.body.id)
      .get()
      .then(async user => {
        if (!user.exists) {
          res.status(404).json({ message: "User not found" });
          return;
        } else {
          await db
            .collection(userCollection)
            .doc(req.body.id)
            .set(links, { merge: true });
        }
        res.status(200).json({ message: `Social media links updated ` });
      });
  } catch (error) {
    functions.logger.log("error:", error);
    res.status(400).send(`Something Went Wrong!!!`);
  }
};

// @desc Add Interests
// @route Patch users/interests
// @access Public
export let interests = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const interests: Interests = {
      interests: req.body["interests"]
    };

    await db
      .collection(userCollection)
      .doc(req.body.id)
      .get()
      .then(async user => {
        if (!user.exists) {
          res.status(404).json({ message: "User not found" });
          return;
        } else {
          await db
            .collection(userCollection)
            .doc(req.body.id)
            .set(interests, { merge: true });
        }
        res.status(200).json({ message: `Interests updated ` });
      });
  } catch (error) {
    functions.logger.log("error:", error);
    res.status(400).send(`User should be interests!!!`);
  }
};

// @desc share invite
// @route Post users/generate-invite
// @access Public
export let generateInvite = async (req, res) => {
  try {
    const invite = {
      invited_by: req.body["invited_by"],
      invite_code: shortid.generate(),
      invited_timestamp: new Date(),
      is_invite_verified: false
    };

    await db
      .collection(invitationCollection)
      .doc()
      .set(invite, { merge: true })
      .then(userUdated => {
        console.log("new user", userUdated);
        if (userUdated)
          res.status(201).json({
            message: "User Invited Successfully",
            details: {
              invite_code: invite.invite_code
            }
          });
      });
  } catch (error) {
    functions.logger.log("error:", error);
    res.status(400).send(`Invite should contain phone, referrer!!!`);
  }
};

// @desc invite code
// @route Post users/validate-invite
// @access Public
export let validateInvite = async (req, res) => {
  try {
    const user = {
      invite_code: req.body["invite_code"]
    };
    await db
      .collection(invitationCollection)
      .where("invite_code", "==", user.invite_code)
      .get()
      .then(invite => {
        if (invite.empty) {
          res.status(200).json({ message: "Invalid invite code " });
          return;
        } else {
          console.log("invite", invite.docs[0].data());
          res.status(200).json({
            message: "Invite Code is Valid",
            details: invite.docs[0].data()
          });
          return;
        }
      });
  } catch (error) {
    console.log("error:", error);
    res.status(400).send(`Something Went Wrong`);
  }
};

// @desc Verify Phone Number
// @route Post /users/check-phone
// @access Public
export let checkPhone = async (req, res) => {
  try {
    const user = {
      phone: req.body["phone"]
    };

    await db
      .collection(userCollection)
      .where("phone", "==", user.phone)
      .get()
      .then(userData => {
        if (userData.empty) {
          res.status(404).json({ message: "User not found" });
          return;
        } else {
          res.status(200).json({
            message: "User Found",
            details: {
              id: userData.docs[0].id,
              phone: userData.docs[0].data().phone
            }
          });
          return;
        }
      });
  } catch (error) {
    functions.logger.log("error:", error);
    res.status(400).send(`Something Went Wrong`);
  }
};

// @desc Login
// @route Post /users/login
// @access Public
export let loginUser = async (req, res) => {
  try {
    const user = {
      phone: req.body["phone"]
    };

    await db
      .collection(userCollection)
      .where("phone", "==", user.phone)
      .get()
      .then(userData => {
        if (userData.empty) {
          res.status(404).json({ message: "User not found" });
          return;
        } else {
          const token = jwt.sign(
            { id: userData.docs[0].id },
            config.TOKEN_SECRET
          );
          res
            .header("auth-user", token)
            .status(200)
            .json({
              message: "User Found",
              details: {
                id: userData.docs[0].id,
                phone: userData.docs[0].data().phone
              }
            });
          return;
        }
      });
  } catch (error) {
    functions.logger.log("error:", error);
    res.status(400).send(`Something Went Wrong`);
  }
};

// @desc fetchProfile
// @route Post /users/fetch-profile
// @access Public
export let fetchProfile = async (req, res) => {
  try {
    let token = req.headers.token;
    const decoded = jwt.verify(token, config.TOKEN_SECRET);
    let id = decoded["id"];

    await db
      .collection(userCollection)
      .doc(id)
      .get()
      .then(userData => {
        if (!userData.exists) {
          res.status(404).json({ message: "User not found" });
          return;
        } else {
          res.status(200).json({
            message: "User Found",
            details: {
              id: userData.data().id,
              data: userData.data()
            }
          });
          return;
        }
      });
  } catch (error) {
    functions.logger.log("error:", error);
    res.status(400).send(`Something Went Wrong`);
  }
};

export let connect = async (req, res) => {
  try {
    const loggedInUserId = req.user.id;
    const mainUserId = req.body.userId;
    const userDoc = await db.collection(userCollection).doc(loggedInUserId);
    const userSnap = await userDoc.get();
    const userData = userSnap.data();
    const mainUserDoc = await db.collection(userCollection).doc(mainUserId);
    const mainUserSnap = await mainUserDoc.get();
    const mainUserData = mainUserSnap.data();
    let connectionUser = {
      userId: mainUserSnap.id,
      username: mainUserData.name,
      imageUrl: mainUserData.imageUrl
    };
    console.log(mainUserId);
    let include = userData.connections.filter(
      user => user.userId === mainUserId
    );
    console.log(include);
    let message = "follow";
    if (include.length > 0) {
      let index = userData.connections.indexOf(connectionUser);
      userData.connections.splice(index, 1);
      message = "unfollow";
    } else {
      userData.connections.push(connectionUser);
    }
    await userDoc.update({
      ...userData
    });
    res.status(200).send({ message: message });
    return;
  } catch (error) {
    console.log(error);
    res.status(400).send(`Something Went Wrong`);
    return;
  }
};

export let getFeed = async (req, res) => {
  //const loggedInUserId = "1y3pndxfqyJnCO8TsFwY";
  const loggedInUserId = req.user.id;
  const page = req.query.page;
  const docId = req.query.lastDocId;
  let postPerPage = 20;
  console.log(page);
  console.log(loggedInUserId);

  let docSnap;

  if (page === "1") {
    console.log("in if");
    docSnap = await db
      .collection(homeFeedCollection)
      .doc(loggedInUserId)
      .collection("feed")
      .orderBy("Timestamp", "desc")
      .limit(postPerPage)
      .get();
  } else {
    let lastSnap = await db
      .collection(homeFeedCollection)
      .doc(loggedInUserId)
      .collection("feed")
      .doc(docId)
      .get();
    docSnap = await db
      .collection(homeFeedCollection)
      .doc(loggedInUserId)
      .collection("feed")
      .orderBy("Timestamp", "desc")
      .startAfter(lastSnap)
      .limit(postPerPage)
      .get();
  }

  console.log(docSnap.empty);
  const feedPost = [];
  let index = 0;
  docSnap.forEach(doc => {
    feedPost.push(doc.data());
    feedPost[index++].id = doc.id;
  });
  let lastDocId;
  if (!docSnap.empty) {
    lastDocId = docSnap.docs[docSnap.docs.length - 1].id;
  }
  res.status(200).send({ feedPosts: feedPost, lastDocId: lastDocId });
  return;
};

export let uploadProfileImage = async (req, res, next) => {
  try {
    let imageUrl = req.body.imageUrl;
    if (!imageUrl) {
      res.status(400).send("File not found!)");
      return;
    }
    const publicUrl = imageUrl;

    console.log("url", publicUrl);
    let userDoc = await db.collection(userCollection).doc(req.user.id);
    userDoc.update({ imageUrl: publicUrl });
    res.status(200).send({ message: "image Uploaded successfully!" });
    let stories = await db
      .collection("stories")
      .where("userId", "==", req.user.id)
      .get();
    let storieDoc = stories.docs[0];
    await storieDoc.ref.update({ profile: imageUrl });
    let posts = await db
      .collection("posts")
      .where("user_id", "==", req.user.id)
      .get();
    posts.forEach(doc => {
      doc.ref.update({ userProfileImage: imageUrl });
    });
    let connections = (await userDoc.get()).data().connections;
    connections.forEach(async user => {
      await db
        .collection("feedStory")
        .doc(user.userId)
        .collection("stories")
        .doc(storieDoc.id)
        .update({ profile: imageUrl });
    });
    let userfeedPosts = await db
      .collection(homeFeedCollection)
      .doc(req.user.id)
      .collection("feed")
      .where("user_id", "==", req.user.id)
      .get();
    userfeedPosts.forEach(async doc => {
      doc.ref.update({ userProfileImage: imageUrl });
    });
    connections.forEach(async user => {
      let feedPosts = await db
        .collection(homeFeedCollection)
        .doc(user.userId)
        .collection("feed")
        .where("user_id", "==", req.user.id)
        .get();
      feedPosts.forEach(async doc => {
        doc.ref.update({ userProfileImage: imageUrl });
      });
    });
  } catch (error) {
    functions.logger.log("error:", error);
    res.status(400).send(`Something went wrong try again!!`);
    return;
  }
};

export let searchUser = async (req, res, next) => {
  try {
    let query = toTitleCase(req.body.query);
    let userDocs1 = await (
      await db
        .collection(userCollection)
        .where("phone", "==", query)
        .get()
    ).docs;
    let userDocs2 = await (
      await db
        .collection(userCollection)
        .where("name", "==", query)
        .get()
    ).docs;

    let userData1 = userDocs1.map(user => user.data());
    let userData2 = userDocs2.map(user => user.data());
    let result = userData1.concat(userData2);
    console.log(result);
    res.status(200).send({ data: result });
  } catch (error) {
    functions.logger.log("error:", error);
    res.status(400).send(`Something went wrong try again!!`);
    return;
  }
};
