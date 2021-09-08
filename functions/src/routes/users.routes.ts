import * as express from "express";
import * as userController from "../controllers/users.controllers";
const router = express.Router();
const authUser = require("../middlewares/auth-user");

router.route("/signup").post(userController.registerUsers);
router.route("/social").put(userController.socialAccounts);
router.route("/interests").put(userController.interests);
router.route("/send-otp").post(userController.sendOtp);
router.route("/verify").post(userController.verifyPhoneOtp);
router.route("/generate-invite").post(userController.generateInvite);
router.route("/validate-invite").post(userController.validateInvite);
router.route("/check-phone").post(userController.checkPhone);
router.route("/fetch-profile").get(userController.fetchProfile);
router.route("/login").post(userController.loginUser);
router.route("/edit-profile").post(userController.editProfile);
router.route("/connect").post(authUser, userController.connect);
router.route("/search").post(userController.searchUser);

//router.route("/get-feed").get((req,res,next)=>{console.log("gotcha");next()},userController.getFeed);
router.route("/get-feed").get(authUser, userController.getFeed);

module.exports = router;
