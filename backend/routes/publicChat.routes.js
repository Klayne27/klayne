import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  addReactionToPublicMessage,
  adminDeletePublicMessage,
  banUserFromPublicChat,
  deleteOwnPublicMessage,
  editPublicMessage,
  getPublicMessages,
  sendPublicMessage,
  toggleMutePublicChat,
  unbanUserFromPublicChat,
} from "../controllers/publicChat.controller.js";

const router = express.Router();

router.use(protectRoute);

// --- CORE CHAT FUNCTIONS ---
router.get("/messages", getPublicMessages);
router.post("/send", sendPublicMessage);

// --- USER MESSAGE ACTIONS ---
router.put("/edit/:messageId", editPublicMessage);
router.post("/react/:messageId", addReactionToPublicMessage);
router.delete("/:messageId", deleteOwnPublicMessage);
router.post("/mute", toggleMutePublicChat);


// --- ADMIN MODERATION ---
router.delete("/admin/delete/:messageId", adminDeletePublicMessage);
router.put("/admin/ban/:userId", banUserFromPublicChat);
router.put("/admin/unban/:userId", unbanUserFromPublicChat);

export default router;
