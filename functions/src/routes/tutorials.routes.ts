import * as express from "express";
import * as tutorialController from "../controllers/tutorials.controller";

const router = express.Router();

router.post("/add-tutorial", tutorialController.addTutorial);
router.get("/get-tutorial", tutorialController.getTutorials);
router.post("/update-tutorial", tutorialController.updateTutorial);
router.post("/delete-tutorial", tutorialController.deleteTutorial);
router.get("/getTutorialById", tutorialController.getATutorialById);
router.get("/getAllTuts/:game", tutorialController.getAllTuts);
module.exports = router;
