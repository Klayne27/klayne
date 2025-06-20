import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  getConversations,
  sendMessage,
  getFollowedUsersForMessaging,
  getMessagesByConversationId,
  deleteMessage,
  deleteConversationForUser,
} from "../controllers/message.Controllers.js";

const router = express.Router();

router.get("/followed-users-for-messaging", protectRoute, getFollowedUsersForMessaging);
router.get("/conversations", protectRoute, getConversations);
router.get("/conversations/:conversationId", protectRoute, getMessagesByConversationId);
router.post("/", protectRoute, sendMessage);
router.delete("/:messageId", protectRoute, deleteMessage);
router.delete("/conversations/:conversationId", protectRoute, deleteConversationForUser); // Corrected to use conversationId

export default router;
