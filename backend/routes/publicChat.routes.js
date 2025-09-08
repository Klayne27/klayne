import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  banUserFromPublicChat,
  adminDeletePublicMessage,
  getPublicMessages,
  sendPublicMessage,
  unbanUserFromPublicChat,
  addReactionToPublicMessage,
  deleteOwnPublicMessage,
  editPublicMessage,
} from "../controllers/publicChat.controller.js";

const router = express.Router();

router.post("/send", protectRoute, sendPublicMessage); 
router.get("/messages", protectRoute, getPublicMessages);

router.delete("/admin/delete/:messageId", protectRoute, adminDeletePublicMessage);
router.put("/admin/ban/:userId", protectRoute, banUserFromPublicChat);
router.put("/admin/unban/:userId", protectRoute, unbanUserFromPublicChat);

router.post("/:messageId/react", protectRoute, addReactionToPublicMessage);
router.delete("/:messageId", protectRoute, deleteOwnPublicMessage);

router.put("/edit/:messageId", protectRoute, editPublicMessage);

export default router;
