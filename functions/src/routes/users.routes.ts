import * as express from "express";
import * as userController from "../controllers/users.controllers";
const router = express.Router();

router.route("/signup").post(userController.registerUsers);
router.route("/social").patch(userController.socialAccounts);
router.route("/interests").patch(userController.interests);
