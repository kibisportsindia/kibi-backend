import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
// import * as config from "../config/config.json";
// import { Storage } from "@google-cloud/storage";
// const formParser = require("../utils/formParser");
// const MAX_SIZE = 4000000;
// const { v4: uuidv4 } = require("uuid");
const ShortUniqueId = require("short-unique-id");

const suid = new ShortUniqueId();

export let db = admin.firestore();
const storiesCollection = "stories";
const feedStoriesCollection = "feedStory";
const feedStoriesSubCollection = "stories";

// const storage = new Storage({
//   projectId: config.project_id,
// });

//const bucket = storage.bucket(`${config.project_id}.appspot.com`);

export let addStory = async (req, res, next) => {
  try {
    console.log(req.user.id);

    let storiesData = [];

    // console.log(file)

    const publicUrl = req.body.url;
    let data = {
      storyId: suid(),
      publicUrl: publicUrl,
      Timestamp: new Date(),
      viewers: [],
    };
    storiesData.push(data);

    try {
      const userSnap = await db.collection("users").doc(req.user.id).get();
      const userData = userSnap.data();
      console.log(userData);
      const storySnap = await db
        .collection(storiesCollection)
        .where("userId", "==", req.user.id)
        .get();
      let doc;
      let story;
      if (!storySnap.empty) {
        //console.log("storySnap", storySnap);
        doc = storySnap.docs[0];
        let oldStoryData = doc.data().stories;
        let newStoryData = [...oldStoryData];
        storiesData.forEach((story) => {
          newStoryData.push(story);
        });
        let docData = doc.data();
        story = {
          ...docData,
          stories: newStoryData,
        };
        await doc.ref.update({
          stories: newStoryData,
        });
      } else {
        story = {
          userId: req.user.id,
          userName: userData.name,
          userImageUrl: userData.imageUrl,
          stories: storiesData,
        };
        doc = await db.collection(storiesCollection).add({
          ...story,
        });
      }
      //console.log("story!", story);
      story.stories.forEach((story) => {
        delete story.viewers;
      });
      res
        .status(200)
        .send({ message: "Story uploaded Successfully!", data: data });
      //console.log(doc.id);
      //console.log("story", story);
      const connectionId = userData.connections;
      //console.log("connectionsId", connectionId);
      //@send to every connections feed!
      connectionId.forEach((id) => {
        db.collection(feedStoriesCollection)
          .doc(id)
          .collection(feedStoriesSubCollection)
          .doc(doc.id)
          .set({ ...story });
      });
      return;
    } catch (error) {
      console.log(error);
      functions.logger.log("addStory", error);
      return res.status(400).json({ message: "Something Went Wrong!" });
    }
  } catch (error) {
    console.log(error);
    functions.logger.log("addStory", error);
    return res.status(400).json({ message: "Something Went Wrong!" });
  }
};

export let deleteStory = async (req, res, next) => {
  try {
    const storyId = req.body.storyId;
    const storySnap = await db
      .collection(storiesCollection)
      .where("userId", "==", req.user.id)
      .get();
    console.log(storySnap.docs);
    let doc = storySnap.docs[0];
    let newStoryData = doc
      .data()
      .stories.filter((story) => story.storyId !== storyId);
    await doc.ref.update({
      stories: newStoryData,
    });
    let newStory = { ...doc.data(), stories: newStoryData };
    res.status(200).send({ message: "Story deleted successfully!" });

    const userSnap = await db.collection("users").doc(req.user.id).get();
    const userConnectionsId = userSnap.data().connections;
    userConnectionsId.forEach(async (id) => {
      await db
        .collection(feedStoriesCollection)
        .doc(id)
        .collection(feedStoriesSubCollection)
        .doc(doc.id)
        .set({
          ...newStory,
        });
    });

    // let deletedStory = doc
    //   .data()
    //   .stories.filter((story) => story.storyId === storyId);
    // let url = deletedStory[0].publicUrl;
    // let imageName = url.split("o/")[1].split("?")[0];
    // console.log(imageName);
    // const img = bucket.file(imageName);
    // img.delete();
    return;
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Something Went Wrong!" });
  }
};

export let getFeedStory = async (req, res, next) => {
  try {
    console.log(req.user.id);
    const FeedStoryDocs = await db
      .collection(feedStoriesCollection)
      .doc(req.user.id)
      .collection(feedStoriesSubCollection)
      .get();
    let storyFeed = [];
    FeedStoryDocs.forEach((doc) => {
      storyFeed.push(doc.data());
    });
    let filteredStories,
      count = 0;
    console.log("storyFeed", storyFeed);
    storyFeed.forEach((userStories) => {
      filteredStories = userStories.stories.filter((story) => {
        let now = +new Date();
        let createdAt = +story.Timestamp.toDate();
        console.log(story.storyId, story.Timestamp.toDate());
        //console.log("now", now, "createdAt", createdAt);
        const oneDay = 60 * 60 * 24 * 1000;
        var compareDatesBoolean = now - createdAt < oneDay;
        console.log(compareDatesBoolean);
        if (compareDatesBoolean) {
          let time,
            flag = false;
          time = (now - createdAt) / 1000;
          console.log(time);
          if (time > 60 && time < 3600) {
            time = time / 60;
            time = Math.floor(time) + " min";
            flag = true;
          } else if (time > 3600) {
            time = (now - createdAt) / (1000 * 60 * 60);
            time = Math.floor(time) + " hr";
            flag = true;
          }
          if (!flag) time = Math.floor(time) + " s";
          story.time = time;
          return story;
        }
      });
      if (filteredStories.length === 0) {
        storyFeed.splice(count, 1);
      } else {
        userStories.stories = filteredStories;
      }
      count++;
    });
    //console.log(test);
    //console.log(storyFeed);
    const page = req.body.page;
    const paginatedStories = [];
    let lastpage = false;
    console.log(storyFeed);
    if (storyFeed.length >= page * 10) {
      let startingIndex = (page - 1) * 10;
      let endingIndex = page * 10;
      for (let i = startingIndex; i < endingIndex; i++) {
        paginatedStories.push(storyFeed[i]);
      }
    } else {
      let startingIndex = (page - 1) * 10;
      lastpage = true;
      for (let i = startingIndex; i < storyFeed.length; i++) {
        paginatedStories.push(storyFeed[i]);
      }
    }
    return res
      .status(400)
      .json({ stories: paginatedStories, lastpage: lastpage });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Something Went Wrong!" });
  }
};

export let storySeen = async (req, res, next) => {
  try {
    let storyId = req.body.storyId;
    //@userId is id of author of story!
    let userId = req.body.userId;
    console.log(storyId, userId);
    const userSnap = await db.collection("users").doc(req.user.id).get();
    const userData = userSnap.data();
    let docSnap = await db
      .collection(storiesCollection)
      .where("userId", "==", userId)
      .get();
    let storiesData = docSnap.docs[0].data().stories;
    let user;
    storiesData.forEach((story) => {
      if (story.storyId === storyId) {
        console.log("story", story);
        user = [];
        if (story.viewers.length !== 0) {
          user = story.viewers.filter((user) => user.userId === req.user.id);
        }
        if (user.length) return;
        story.viewers.push({
          userId: req.user.id,
          username: userData.name,
          userImageUrl: userData.imageUrl,
          role: userData.role,
        });
      }
    });
    //console.log("storiesData", storiesData);
    if (user.length) {
      res.status(400).send({ message: "viewer already added!" });
      return;
    }
    console.log("agter return!!");
    await docSnap.docs[0].ref.update({
      stories: storiesData,
    });
    res.status(200).send({ message: "viewer added!" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Something Went Wrong!" });
  }
};

export let getViewersList = async (req, res, next) => {
  try {
    let storyId = req.query.storyId;
    //@userId is id of author of story!
    console.log(storyId);
    let userId = req.user.id;
    console.log(userId);
    let docSnap = await db
      .collection(storiesCollection)
      .where("userId", "==", userId)
      .get();
    let storiesData = docSnap.docs[0].data().stories;
    //console.log(story);
    let story = storiesData.filter((story) => story.storyId === storyId);
    console.log(story);
    res.status(200).send({ viewers: story[0].viewers });
    return;
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Something Went Wrong!" });
  }
};

export let getUserStory = async (req, res, next) => {
  try {
    const userStoriesSnap = await db
      .collection(storiesCollection)
      .where("userId", "==", req.user.id)
      .get();
    const userStoriesDoc = userStoriesSnap.docs[0].data();

    let filteredStories = userStoriesDoc.stories.filter((story) => {
      let now = +new Date();
      let createdAt = +story.Timestamp.toDate();
      console.log(story.storyId, story.Timestamp.toDate());
      //console.log("now", now, "createdAt", createdAt);
      const oneDay = 60 * 60 * 24 * 1000;
      var compareDatesBoolean = now - createdAt < oneDay;
      console.log(compareDatesBoolean);
      if (compareDatesBoolean) {
        let time,
          flag = false;
        time = (now - createdAt) / 1000;
        console.log(time);
        if (time > 60 && time < 3600) {
          time = time / 60;
          time = Math.floor(time) + " min";
          flag = true;
        } else if (time > 3600) {
          time = (now - createdAt) / (1000 * 60 * 60);
          time = Math.floor(time) + " hr";
          flag = true;
        }
        if (!flag) time = Math.floor(time) + " s";
        story.time = time;
        return story;
      }
    });

    userStoriesDoc.stories = filteredStories;
    res.status(200).send({ stories: userStoriesDoc });
    return;
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Something Went Wrong!" });
  }
};
