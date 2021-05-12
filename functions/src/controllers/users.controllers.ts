import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import * as config from "../config/config.json";
import * as configTwilio from "../config/config";
import { Twilio } from "twilio";
import { User, Social, Interests } from "../models/User";

admin.initializeApp(functions.config().firebase);
export let db = admin.firestore();
const userCollection = "users";
const invitationCollection = "invitation";

const client = new Twilio(configTwilio.accountSID, configTwilio.authToken);

// @desc SignUp/Login
// @route POST api/users/signup
// @access Public
export let registerUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user: User = {
      invite_code: req.body["invite_code"],
      phone: req.body["phone"],
      name: req.body["name"],
      age: req.body["age"],
      location: req.body["location"],
      role: req.body["role"],
      gender: req.body["gender"],
      invited_by: invitedUser,
    };
    const snapshot = await db
      .collection(invitationCollection)
      .where("invite_code", "==", user.invite_code)
      .get();

    const invitedUser = snapshot.forEach((userData) => {
      if (userData.exists) {
        return userData.data().invited_by;
      }
    });

    const newDoc = await db.collection(userCollection).add(user);
    const token = jwt.sign({ id: newDoc.id }, config.TOKEN_SECRET);
    res
      .header("auth-user", token)
      .status(201)
      .send(`Created a new user add profile: ${newDoc.id}`);
  } catch (error) {
    functions.logger.log("error:", error);
    res.status(400).send(`Something Went Wrong`);
  }
};

// @desc Verify Phone Number
// @route Post /api/users/check-phone
// @access Public
export let checkPhone = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = {
      phone: req.body["phone"],
    };

    const snapshot = await db
      .collection(userCollection)
      .where("phone", "==", user.phone)
      .get();

    snapshot.forEach(async (userdata) => {
      if (!userdata.exists) {
        res.status(200).json({ message: "User not found" });
      }
      const data = await client.verify
        .services(configTwilio.serviceID)
        .verifications.create({
          to: `${userdata.data().phone}`,
          channel: "sms",
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
            dateCreated: data.dateCreated,
          },
        },
      });
      return;
    });
  } catch (error) {
    functions.logger.log("error:", error);
    res.status(400).send(`Something Went Wrong`);
  }
};

// @desc Verify the Code
// @route Get /api/users/verify
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
    const user = await db.collection(userCollection).doc(userPhone).get();
    if (!user) throw new Error("User not found");
      
       
    const info = await client.verify
      .services(configTwilio.serviceID)
      .verificationChecks.create({
        to: user.phone,
        code: req.query.code,
      });
  } catch (error) {}
};

// @desc Add Social Accounts
// @route Patch api/users/social
// @access Public
export let socialAccounts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user: Social = {
      social_links: req.body["social_links"],
    };

    const newDoc = await db.collection(userCollection).add(user);
    res.status(201).send(`Added a new user Social Links: ${newDoc.id}`);
  } catch (error) {
    functions.logger.log("error:", error);
    res.status(400).send(`User should contain social accounts!!!`);
  }
};

// @desc Add Interests
// @route Patch api/users/interests
// @access Public
export let interests = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user: Interests = {
      interests: req.body["interests"],
    };

    const newDoc = await db.collection(userCollection).add(user);
    res.status(201).send(`Added a new user Interests: ${newDoc.id}`);
  } catch (error) {
    functions.logger.log("error:", error);
    res.status(400).send(`User should be interests!!!`);
  }
};
