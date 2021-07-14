import * as express from 'express';
import * as ChatRoomController from '../controllers/chatroom.controllers';

const router = express.Router();

router.route('/initiate').post(ChatRoomController.initiateChatRoom);


module.exports = router;