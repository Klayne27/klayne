import express from "express";
import { protectRoute } from "../middleware/protectRoute.js"; // Assuming you have this
import {
  banUserFromPublicChat,
  deletePublicMessage,
  getPublicMessages,
  sendPublicMessage,
  unbanUserFromPublicChat,
} from "../controllers/publicChat.controllers.js";

const router = express.Router();

// Routes for regular users
router.post("/send", protectRoute, sendPublicMessage); // 'img' is the field name for the file
router.get("/messages", protectRoute, getPublicMessages);

// Admin-only routes
router.delete("/admin/delete/:messageId", protectRoute, deletePublicMessage);
router.put("/admin/ban/:userId", protectRoute, banUserFromPublicChat);
router.put("/admin/unban/:userId", protectRoute, unbanUserFromPublicChat);

export default router;
