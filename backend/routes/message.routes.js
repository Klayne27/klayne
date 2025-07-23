import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  getConversations,
  sendMessage,
  getMessagesByConversationId,
  deleteMessage,
  reactToMessage,
  editMessage,
  toggleConversationVisibility,
  getConversationBetweenUsers,
  getFollowedUsersForMessaging,
  getOrCreateConversation,
} from "../controllers/message.Controllers.js";

const router = express.Router();

router.get("/conversations", protectRoute, getConversations);
router.get("/conversations/:conversationId", protectRoute, getMessagesByConversationId);
router.post("/", protectRoute, sendMessage);
router.delete("/:messageId", protectRoute, deleteMessage);
router.post("/react/:messageId", protectRoute, reactToMessage);
router.put("/edit/:id", protectRoute, editMessage);
router.put(
  "/conversations/visibility/:conversationId",
  protectRoute,
  toggleConversationVisibility
);
router.get(
  "/conversations/between/:otherUserId",
  protectRoute,
  getConversationBetweenUsers
);

// Route to get followed users for messaging
router.get("/followed-for-messaging", protectRoute, getFollowedUsersForMessaging);

// Route to get or create a conversation (if you don't have one that fits this exact need)
router.post("/conversations/get-or-create", protectRoute, getOrCreateConversation);

export default router;
