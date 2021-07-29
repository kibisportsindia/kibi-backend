import * as express from "express";
import * as storyController from "../controllers/story.controller";
const authUser = require("../middlewares/auth-user");
const router = express.Router();

router.post("/addStory", authUser, storyController.addStory);
router.post("/deleteStory", authUser, storyController.deleteStory);
router.post("/storySeen", authUser, storyController.storySeen);

router.get("/getFeedStory", authUser, storyController.getFeedStory);
router.get("/getStoryViewers", authUser, storyController.getViewersList);
router.get("/getUserStory",authUser,storyController.getUserStory)
module.exports = router;
