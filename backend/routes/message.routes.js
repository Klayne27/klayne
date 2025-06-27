import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  getConversations,
  sendMessage,
  getFollowedUsersForMessaging,
  getMessagesByConversationId,
  deleteMessage,
  deleteConversationForUser,
  reactToMessage,
} from "../controllers/message.controllers.js";

const router = express.Router();

router.get("/followed-users-for-messaging", protectRoute, getFollowedUsersForMessaging);
router.get("/conversations", protectRoute, getConversations);
router.get("/conversations/:conversationId", protectRoute, getMessagesByConversationId);
router.post("/", protectRoute, sendMessage);
router.delete("/:messageId", protectRoute, deleteMessage);
router.delete("/conversations/:conversationId", protectRoute, deleteConversationForUser);
router.post("/react/:messageId", protectRoute, reactToMessage);

export default router;
