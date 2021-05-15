import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import * as config from "../config/config.json";
import { configTwilio } from "../config/config";
import { Twilio } from "twilio";
import { User, Social, Interests } from "../models/User";
var shortid = require("shortid");

admin.initializeApp(functions.config().firebase);
export let db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
const userCollection = "users";
const invitationCollection = "invitation";

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
            invited_by: inviteData["invited_by"]
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
export let sendotp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = {
      phone: req.body["phone"]
    };

    const snapshot = await db
      .collection(userCollection)
      .where("phone", "==", user.phone)
      .get();

    snapshot.forEach(async userdata => {
      if (!userdata.exists) {
        res.status(200).json({ message: "User not found" });
      }
      const data = await client.verify
        .services(configTwilio.serviceID)
        .verifications.create({
          to: `${userdata.data().phone}`,
          channel: "sms"
        });
      res.status(200).json({
        message: "User Found",
        details: {
          id: userdata.id,
          phone: userdata.data().phone,
          data: {
            to: data.to,
            channel: data.channel,
            status: data.status,
            dateCreated: data.dateCreated
          }
        }
      });
      return;
    });
  } catch (error) {
    functions.logger.log("error:", error);
    res.status(400).send(`Something Went Wrong`);
  }
};

// @desc Verify the Code
// @route Get /users/verify
// @access Public
export let verifyPhone = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userPhone = req.query.phone;
    if (!userPhone) {
      res.status(404).json({ error: "Dataset not found" });
      return;
    }
    if (typeof userPhone !== "string") {
      res.status(500).json({ error: "Invalid dataset" });
      return;
    }
    const user = await db
      .collection(userCollection)
      .doc(userPhone)
      .get();
    if (!user) throw new Error("User not found");

    const info = await client.verify
      .services(configTwilio.serviceID)
      .verificationChecks.create({
        to: userPhone,
        code: req.query.code + ""
      });
    console.log("info ", info);
  } catch (error) {}
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
    const user: Social = {
      social_links: req.body["social_links"]
    };

    const newDoc = await db.collection(userCollection).add(user);
    res.status(201).send(`Added a new user Social Links: ${newDoc.id}`);
  } catch (error) {
    functions.logger.log("error:", error);
    res.status(400).send(`User should contain social accounts!!!`);
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
    const user: Interests = {
      interests: req.body["interests"]
    };

    const newDoc = await db.collection(userCollection).add(user);
    res.status(201).send(`Added a new user Interests: ${newDoc.id}`);
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

    const snapshot = await db
      .collection(userCollection)
      .where("phone", "==", user.phone)
      .get();

    snapshot.forEach(userdata => {
      if (!userdata.exists) {
        res.status(200).json({ message: "User not found" });
      }
      res.status(200).json({
        message: "User Found",
        details: {
          id: userdata.id,
          phone: userdata.data().phone
        }
      });
      return;
    });
  } catch (error) {
    functions.logger.log("error:", error);
    res.status(400).send(`Something Went Wrong`);
  }
};
