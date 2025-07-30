import express from "express";
import { protectRoute } from "../middleware/protectRoute.js"; // Assuming you have this
import {
  banUserFromPublicChat,
  adminDeletePublicMessage,
  getPublicMessages,
  sendPublicMessage,
  unbanUserFromPublicChat,
  // removeReactionFromPublicMessage,
  addReactionToPublicMessage,
  deleteOwnPublicMessage,
  editPublicMessage,
} from "../controllers/publicChat.controllers.js";

const router = express.Router();

// Routes for regular users
router.post("/send", protectRoute, sendPublicMessage); // 'img' is the field name for the file
router.get("/messages", protectRoute, getPublicMessages);

// Admin-only routes
router.delete("/admin/delete/:messageId", protectRoute, adminDeletePublicMessage);
router.put("/admin/ban/:userId", protectRoute, banUserFromPublicChat);
router.put("/admin/unban/:userId", protectRoute, unbanUserFromPublicChat);

// New Routes for Reactions
router.post("/:messageId/react", protectRoute, addReactionToPublicMessage);
router.delete("/:messageId", protectRoute, deleteOwnPublicMessage);

router.put("/edit/:messageId", protectRoute, editPublicMessage); // NEW EDIT ROUTE

// router.delete("/:messageId/react", protectRoute, removeReactionFromPublicMessage); // DELETE for removing reaction

export default router;
