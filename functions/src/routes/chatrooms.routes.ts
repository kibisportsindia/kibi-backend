import * as express from "express";
import * as ChatRoomController from "../controllers/chatroom.controllers";
import authUser from "../middlewares/auth-user";

const router = express.Router();

router.route("/initiate").post(ChatRoomController.initiateChatRoom);
router
  .route("/:roomId/message")
  .post(authUser, ChatRoomController.postMessageInChatRoom);
router.route("/:roomId").get(ChatRoomController.getConversationByRoomId);
router.route('/:roomId/mark-read').put(ChatRoomController.markConversationReadByRoomId);

module.exports = router;
