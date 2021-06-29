import * as express from "express";
import * as postController from  "../controllers/posts.controller";

const router = express.Router();

router.post("/create-post",postController.createPost)

module.exports = router