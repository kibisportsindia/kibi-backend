import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
import * as bodyParser from "body-parser";
const cors = require("cors");
var shortid = require("shortid");

//initialize firebase inorder to access its services
admin.initializeApp(functions.config().firebase);

//initialize express server
const app = express();
const main = express();

//add the path to receive request and set json as bodyParser to process the body
main.use("/api/v1", app);
main.use(bodyParser.json());
main.use(cors({ origin: true }));
main.use(bodyParser.urlencoded({ extended: false }));

//initialize the database and the collection
const db = admin.firestore();
const userCollection = "users";

interface User {
  firstName: String;
  lastName: String;
  email: String;
  phone: String;
}

// Create new user
app.post("/users", async (req, res) => {
  try {
    const user: User = {
      firstName: req.body["firstName"],
      lastName: req.body["lastName"],
      email: req.body["email"],
      phone: req.body["phone"]
    };

    const newDoc = await db.collection(userCollection).add(user);
    res.status(201).send(`Created a new user: ${newDoc.id}`);
  } catch (error) {
    functions.logger.log("error:", error);
    res
      .status(400)
      .send(`User should contain firstName, lastName, email , id and phone!!!`);
  }
});

//get all users
app.get("/users", async (req, res) => {
  try {
    const userQuerySnapshot = await db.collection(userCollection).get();
    const users: any[] = [];
    userQuerySnapshot.forEach(doc => {
      users.push({
        id: doc.id,
        data: doc.data()
      });
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).send(error);
  }
});

//get a single contact
app.get("/users/:userId", (req, res) => {
  const userId = req.params.userId;
  db.collection(userCollection)
    .doc(userId)
    .get()
    .then(user => {
      if (!user.exists) throw new Error("User not found");
      res.status(200).json({ id: user.id, data: user.data() });
    })
    .catch(error => res.status(500).send(error));
});

// Delete a user
app.delete("/users/:userId", (req, res) => {
  db.collection(userCollection)
    .doc(req.params.userId)
    .delete()
    .then(() => res.status(204).send("Document successfully deleted!"))
    .catch(function(error) {
      res.status(500).send(error);
    });
});

// Update user
app.put("/users/:userId", async (req, res) => {
  await db
    .collection(userCollection)
    .doc(req.params.userId)
    .set(req.body, { merge: true })
    .then(() => res.json({ id: req.params.userId }))
    .catch(error => res.status(500).send(error));
});

//share invite
app.post("/users/invite", async (req, res) => {
  try {
    const user = {
      phone: req.body["phone"],
      referrer: req.body["referrer"],
      invite_code: shortid.generate(),
      invited_timestamp: new Date()
    };

    // const snapshot = await db
    //   .collection(userCollection)
    //   .where("phone", "==", user.phone)
    //   .get();

    // snapshot.forEach(user => {
    //   res.status(200).json({ id: user.id, data: user.data() });
    //   return;
    // });

    // if (!snapshot) {
    await db
      .collection(userCollection)
      .doc()
      .set(user, { merge: true })
      .then(userUdated => {
        console.log("new user", userUdated);
        if (user)
          res.status(201).json({ message: "User Invited", details: user });
      });

    // }
  } catch (error) {
    functions.logger.log("error:", error);
    res.status(400).send(`Invite should contain phone, referrer!!!`);
  }
});

//validate invite code
app.post("/users/invite", async (req, res) => {
  try {
    const user = {
      phone: req.body["phone"],
      invite_code: req.body["invite_code"]
    };

    // const snapshot = await db
    //   .collection(userCollection)
    //   .where("phone", "==", user.phone)
    //   .get();

    // snapshot.forEach(user => {
    //   res.status(200).json({ id: user.id, data: user.data() });
    //   return;
    // });

    // if (!snapshot) {
    await db
      .collection(userCollection)
      .doc()
      .set(user, { merge: true })
      .then(userUdated => {
        console.log("new user", userUdated);
        if (user)
          res.status(201).json({ message: "User Invited", details: user });
      });

    // }
  } catch (error) {
    functions.logger.log("error:", error);
    res.status(400).send(`Invite should contain phone, referrer!!!`);
  }
});

//define google cloud function name
export const webApi = functions.https.onRequest(main);
