import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import * as config from "../config/config.json";
import { User, Phone, Social, Interests } from "../models/User";

admin.initializeApp(functions.config().firebase);
export let db = admin.firestore();
const userCollection = "users";

// @desc SignUp/Login
// @route POST api/users/signup
// @access Public
export let registerUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user: Phone = {
      phone: req.body["phone"],
    };

    const snapshot = await db
      .collection(userCollection)
      .where("phone", "==", user.phone)
      .get();

    snapshot.forEach((userdata) => {
      if (!userdata.exists) {
        res.status(200).json({ status: false, message: "User not found" });
      }

      const token = jwt.sign({ id: userdata.id }, config.TOKEN_SECRET);

      res
        .header("auth-user", token)
        .status(200)
        .json({
          status: true,
          message: "User Found",
          details: {
            id: userdata.id,
            phone: userdata.data().phone,
          },
        });
      return;
    });
  } catch (error) {
    functions.logger.log("error:", error);
    res.status(400).send(`Something Went Wrong`);
  }
};

// @desc Add Profile Details
// @route Patch api/users/add-profile
// @access Public
export let addProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user: User = {
      name: req.body["name"],
      age: req.body["age"],
      location: req.body["location"],
      role: req.body["role"],
      invite_code: req.body["invite_code"],
      gender: req.body["gender"],
    };

    const newDoc = await db.collection(userCollection).add(user);
    res.status(201).send(`Created a new user add profile: ${newDoc.id}`);
  } catch (error) {
    functions.logger.log("error:", error);
    res.status(400).send(`User should contain add profile details!!!`);
  }
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
