import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  getConversations,
   sendMessage,
  getFollowedUsersForMessaging,
  getMessagesByConversationId,
} from "../controllers/message.Controllers.js";

const router = express.Router();

router.get("/followed-users-for-messaging", protectRoute, getFollowedUsersForMessaging);
router.get("/conversations", protectRoute, getConversations);
// router.get("/:otherUserId", protectRoute, getMessages);
router.get("/conversations/:conversationId", protectRoute, getMessagesByConversationId);

router.post("/", protectRoute, sendMessage);

export default router;
