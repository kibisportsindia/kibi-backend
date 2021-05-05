import * as express from "express";
import * as userController from "../controllers/users.controllers";
const router = express.Router();

router.route("/send-phone").post(userController.registerUsers);
router.route("/add-profile").patch(userController.addProfile);
