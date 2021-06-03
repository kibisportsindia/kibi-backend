import * as express from "express";
import * as eventController from "../controllers/events.controller";
const router = express.Router();

router.route("/add-event").post(eventController.addEvent);
router.route("/get-events").get(eventController.getEvents);
router.route("/update-events").get(eventController.getEvents);
router.route("/delete-event").get(eventController.getEvents);

module.exports = router;
