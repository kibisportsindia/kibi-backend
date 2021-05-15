import * as express from "express";
import * as userController from "../controllers/users.controllers";
const router = express.Router();

router.route("/signup").post(userController.registerUsers);
router.route("/social").patch(userController.socialAccounts);
router.route("/interests").patch(userController.interests);
router.route("/send-otp").post(userController.sendotp);
router.route("/verify").post(userController.verifyPhone);
router.route("/generate-invite").post(userController.generateInvite);
router.route("/validate-invite").post(userController.validateInvite);
router.route("/check-phone").post(userController.checkPhone);

module.exports = router;
