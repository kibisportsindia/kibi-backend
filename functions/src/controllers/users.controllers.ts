import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import * as config from "../config/config.json";
import { configTwilio } from "../config/config";
import { Twilio } from "twilio";
import { User, Social, Interests } from "../models/User";
var shortid = require("shortid");

export let db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
const userCollection = "users";
const invitationCollection = "invitation";
const homeFeedCollection = "homeFeed";
const client = new Twilio(configTwilio.accountSID, configTwilio.authToken);

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
            name: req.body["name"],
            age: req.body["age"],
            location: req.body["location"],
            role: req.body["role"],
            gender: req.body["gender"],
            invited_by: inviteData["invited_by"],
            connections:[]
          };

          //mark invite code as true
          inviteData.is_invite_verified = true;

          await db
            .collection(invitationCollection)
            .doc(inviteDataId)
            .set(inviteData, { merge: true });
          const newDoc = await db.collection(userCollection).add(user);
          const token = jwt.sign({ id: newDoc.id }, config.TOKEN_SECRET);
          res
            .header("auth-user", token)
            .status(201)
            .json({ message: `Created a new user add profile: ${newDoc.id}` });
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
    const data = await client.verify
      .services(configTwilio.serviceID)
      .verifications.create({
        to: `+91${user.phone}`,
        channel: "sms"
      });
    res.status(200).json({
      message: "OTP Sent Successfully",
      details: {
        phone: user.phone,
        data: {
          to: data.to,
          channel: data.channel,
          status: data.status,
          dateCreated: data.dateCreated
        }
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
      gender: req.body["gender"]
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


export let connect = async (req,res) => {
  try{
    const loggedInUserId = req.user.id;
    const mainUserId = req.body.userId;
    const userDoc = await db.collection(userCollection).doc(mainUserId);
    const userSnap = await userDoc.get();
    const userData = userSnap.data();
    if(userData.connections.includes(loggedInUserId)){
      let index = userData.connections.indexOf(loggedInUserId);
      userData.connections.splice(index,1);
    }else{
      userData.connections.push(loggedInUserId)
    }
    await userDoc.update({
      ...userData
    })
    res.status(200).send({message:""})
    return;
  } catch( error ){
    res.status(400).send(`Something Went Wrong`);
    return;
  }
}


export let getFeed = async(req,res) => {
  //const loggedInUserId = "1y3pndxfqyJnCO8TsFwY";
  const loggedInUserId = req.user.id;
  console.log(loggedInUserId)
  const docSnap = await db.collection(homeFeedCollection).doc(loggedInUserId).collection("feed").get();
  console.log(docSnap.empty)
  const feedPost = [];
  let index = 0;
  docSnap.forEach(doc=>{
    feedPost.push(doc.data());
    feedPost[index++].id = doc.id;
  })
  res.status(200).send({posts:feedPost})
  return;
}
