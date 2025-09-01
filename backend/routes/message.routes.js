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
  deleteConversation,
  deleteAllMessagesOnMySide,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
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

router.get("/followed-for-messaging", protectRoute, getFollowedUsersForMessaging);

router.post("/conversations/get-or-create", protectRoute, getOrCreateConversation);

router.delete("/conversations/:id", protectRoute, deleteConversation);
router.delete("/all/:conversationId", protectRoute, deleteAllMessagesOnMySide);

router.get("/:conversationId/pinned", protectRoute, getPinnedMessages)
router.post("/pin-message", protectRoute, pinMessage);
router.post("/unpin-message", protectRoute, unpinMessage);
export default router;
