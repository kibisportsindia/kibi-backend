import * as admin from "firebase-admin";
import { Request, Response, NextFunction } from "express";
import { ChatRoom, ChatMessage } from "../models/ChatRoom";
import * as jwt from "jsonwebtoken";
import * as config from "../config/config.json";
const chatRoomCollection = "rooms";
const chatMessageCollection = "chatMessages";

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
    console.log(roomId);
    await db
      .collection(chatRoomCollection)
      .doc(roomId)
      .get()
      .then(async (availabeRoom) => {
        if (!availabeRoom.exists) {
          res.status(404).json(`no room found with this ID, ${roomId}`);
          return;
        } else {
          const token = req.header("auth-user");
          const decoded = jwt.verify(token, config.TOKEN_SECRET);
          let id = decoded["id"];

          const chatMessage: ChatMessage = {
            chatRoomId: roomId,
            message: req.body["message"],
            postedByUser: id,
            createdAt: new Date(),
          };
          const newMessage = await db
            .collection(chatMessageCollection)
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

// @desc Get Conversation By Room Id
// @route GET room/:roomId
// @access Private
export let getConversationByRoomId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { roomId } = req.params;
    const result = [];
    await db
      .collection(chatRoomCollection)
      .doc(roomId)
      .get()
      .then(async (room) => {
        if (!room.exists) {
          res.status(404).json(`no room found with this ID, ${roomId}`);
        }
        const conversation = await db
          .collection(chatMessageCollection)
          .where("chatRoomId", "==", roomId)
          .get();
        conversation.forEach((snapshot) => {
          result.push(snapshot.data());
        });
        res.status(200).json({ success: true, data: result });
        return;
      });
  } catch (error) {
    res
      .status(400)
      .send(
        `Something went wrong while getting a message by roomId, ERROR: ${error}`
      );
    return;
  }
};

// @desc Mark Conversation Read By RoomId
// @route PUT room/:roomId/mark-read
// @access Private
export let markConversationReadByRoomId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { roomId } = req.params;
    await db
      .collection(chatRoomCollection)
      .doc(roomId)
      .get()
      .then(async (room) => {
        if (!room.exists) {
          res.status(404).json({
            success: false,
            data: `no room found with this ID, ${roomId}`,
          });
          return;
        }
        const token = req.header("auth-user");
        const decoded = jwt.verify(token, config.TOKEN_SECRET);
        let id = decoded["id"];
        const filter = await db
          .collection(chatMessageCollection)
          .where("chatRoomId", "==", roomId)
          .get();
        const filterId = filter.docs[0].id;
        const data = await db
          .collection(chatMessageCollection)
          .doc(filterId)
          .update({ readByRecipient: id });
        res.status(200).json({ success: true, data: data });
        return;
      });
  } catch (error) {
    res
      .status(400)
      .send(
        `Something went wrong while mark as read by RoomId, ERROR: ${error}`
      );
    return;
  }
};
