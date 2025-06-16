import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  getConversations,
  getMessages,
  sendMessage,
  getFollowedUsersForMessaging,
} from "../controllers/message.Controllers.js";

const router = express.Router();

router.get("/followed-users-for-messaging", protectRoute, getFollowedUsersForMessaging);
router.get("/conversations", protectRoute, getConversations);
router.get("/:otherUserId", protectRoute, getMessages);
router.post("/", protectRoute, sendMessage);

export default router;
