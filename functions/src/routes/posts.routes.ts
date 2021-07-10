import * as express from "express";
import * as postController from  "../controllers/posts.controller";

const router = express.Router();

router.post("/create-post",postController.createPost)
router.post("/get-posts",postController.getPosts)
router.post("/update-post",postController.updatePost)
router.post("/delete-post",postController.deletePost)

router.post("/like-post",postController.likePost)

router.post("/add-comment",postController.commentOnPost)
router.post("/delete-comment",postController.deleteComment)
router.post("/reply-comment",postController.replyOnComment)

module.exports = router