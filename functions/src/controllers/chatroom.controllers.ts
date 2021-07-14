import * as admin from "firebase-admin";
import { Request, Response, NextFunction } from "express";
import { ChatRoom } from "../models/ChatRoom";
const chatRoomCollection = "rooms";

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
