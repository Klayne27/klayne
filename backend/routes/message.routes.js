import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  deleteAllMessagesOnMySide,
  deleteConversation,
  deleteMessage,
  editMessage,
  getConversationBetweenUsers,
  getConversations,
  getFollowedUsersForMessaging,
  getMessagesByConversationId,
  getOrCreateConversation,
  getPinnedMessages,
  pinMessage,
  reactToMessage,
  searchConversationsAndUsers,
  sendMessage,
  toggleConversationVisibility,
  unpinMessage,
} from "../controllers/message.controller.js";

const router = express.Router();

router.use(protectRoute);

// --- SEARCH & DISCOVERY ---
router.get("/search", searchConversationsAndUsers);
router.get("/followed-for-messaging", getFollowedUsersForMessaging);

// --- CONVERSATION MANAGEMENT ---
router.get("/conversations", getConversations);
router.post("/conversations/get-or-create", getOrCreateConversation);
router.get("/conversations/between/:otherUserId", getConversationBetweenUsers);
router.put("/conversations/visibility/:conversationId", toggleConversationVisibility);
router.delete("/conversations/:id", deleteConversation);

// --- MESSAGE ACTIONS (CRUD) ---
router.post("/", sendMessage);
router.put("/edit/:messageId", editMessage);
router.post("/react/:messageId", reactToMessage);
router.delete("/:messageId", deleteMessage);
router.delete("/all/:conversationId", deleteAllMessagesOnMySide);

// --- PINNED MESSAGES ---
router.post("/pin-message", pinMessage);
router.post("/unpin-message", unpinMessage);
router.get("/:conversationId/pinned", getPinnedMessages);

// --- FETCH MESSAGES (Parameterized) ---
router.get("/conversations/:conversationId", getMessagesByConversationId);

export default router;
