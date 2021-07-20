export interface ChatRoom {
  chatInitiator: String;
  userId: String;
  createdAt: Date;
}

export interface ChatMessage {
  chatRoomId: String;
  message: String;
  postedByUser: String;
  createdAt: Date;
}
