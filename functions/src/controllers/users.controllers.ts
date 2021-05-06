import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import * as config from "../config/config.json";
import { User, Phone } from "../models/User";

admin.initializeApp(functions.config().firebase);
export let db = admin.firestore();
const userCollection = "users";

// @desc SignUp
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
        res.status(200).json({ message: "User not found" });
      }

      const token = jwt.sign({ id: userdata.id }, config.TOKEN_SECRET);

      res
        .header("auth-user", token)
        .status(200)
        .json({
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
// @route POST api/users/add-profile
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
      gender: req.body["gender"],
    };

    const newDoc = await db.collection(userCollection).add(user);
    res.status(201).send(`Created a new user: ${newDoc.id}`);
  } catch (error) {
    functions.logger.log("error:", error);
    res
      .status(400)
      .send(`User should contain firstName, lastName, email , id and phone!!!`);
  }
};
