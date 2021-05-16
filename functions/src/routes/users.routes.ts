import * as express from "express";
import * as userController from "../controllers/users.controllers";
const router = express.Router();

router.route("/signup").post(userController.registerUsers);
router.route("/social").put(userController.socialAccounts);
router.route("/interests").put(userController.interests);
router.route("/send-otp").post(userController.sendOtp);
router.route("/verify").post(userController.verifyPhoneOtp);
router.route("/generate-invite").post(userController.generateInvite);
router.route("/validate-invite").post(userController.validateInvite);
router.route("/check-phone").post(userController.checkPhone);

module.exports = router;
