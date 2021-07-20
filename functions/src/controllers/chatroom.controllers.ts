import * as admin from "firebase-admin";
import { Request, Response, NextFunction } from "express";
import { ChatRoom, ChatMessage } from "../models/ChatRoom";
import * as jwt from "jsonwebtoken";
import * as config from "../config/config.json";
const chatRoomCollection = "rooms";
const ChatMessageCollection = "chatMessages";

export let db = admin.firestore();

// @desc Initiate Chat Room
// @route POST room/initiate
// @access Private
export let initiateChatRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await db
      .collection(chatRoomCollection)
      .where("chatInitiator", "==", req.body.chatInitiator)
      .get()
      .then(async (availabeRoom) => {
        if (!availabeRoom.empty) {
          res.status(302).json({
            isNew: false,
            message: "retrieving an old chat room",
            chatroomId: availabeRoom.docs[0].data().id,
          });
          return;
        } else {
          const chatRoom: ChatRoom = {
            userId: req.body["userId"],
            chatInitiator: req.body["chatInitiator"],
            createdAt: new Date(),
          };
          const newRoom = await db.collection(chatRoomCollection).add(chatRoom);
          res.status(201).json({
            isNew: true,
            message: "new chat room created",
            newRoom: newRoom.id,
          });
          return;
        }
      });
  } catch (error) {
    res.status(400).send("Something went wrong!");
    return;
  }
};

// @desc Post Message In Chat Room
// @route POST room/:roomId/message
// @access Private
export let postMessageInChatRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { roomId } = req.params;
    await db
      .collection(ChatMessageCollection)
      .where("id", "==", roomId)
      .get()
      .then(async (availabeRoom) => {
        if (availabeRoom.empty) {
          res.status(404).json(`no room found with this ID, ${roomId}`);
        } else {
          const token = req.header("auth-user");
          const decoded = jwt.verify(token, config.TOKEN_SECRET);
          let id = decoded["id"];

          const chatMessage: ChatMessage = {
            chatRoomId: availabeRoom.docs[0].data().id,
            message: req.body["message"],
            postedByUser: id,
            createdAt: new Date(),
          };
          const newMessage = await db
            .collection(ChatMessageCollection)
            .add(chatMessage);
          res.status(201).json({ status: "success", message: newMessage.id });
          return;
        }
      });
  } catch (error) {
    res
      .status(400)
      .send(`Something went wrong while sending a message, ERROR: ${error}`);
    return;
  }
};
