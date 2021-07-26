import * as express from "express";
import * as postController from "../controllers/posts.controller";
const authUser = require("../middlewares/auth-user");
const router = express.Router();

router.post("/create-post", authUser, postController.createPost);
router.post("/get-posts", authUser, postController.getPosts);
router.post("/update-post", authUser, postController.updatePost);
router.post("/delete-post", authUser, postController.deletePost);

router.post("/like-post", authUser, postController.likePost);

router.post("/add-comment", authUser, postController.commentOnPost);
router.post("/delete-comment", authUser, postController.deleteComment);
router.post("/reply-comment", authUser, postController.replyOnComment);
router.get("/getComments", authUser, postController.getCommentsByPostId);
router.get("/getCommentReplies", authUser, postController.getCommentReplies);

router.post("/sharePost", authUser, postController.addSharePost);
router.post("/deleteSharePost", authUser, postController.deleteSharedPost);

//router.post("/test", postController.test);

module.exports = router;
