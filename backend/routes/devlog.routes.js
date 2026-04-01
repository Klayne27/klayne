import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { isAdmin } from "../middleware/isAdmin.js";
import {
  createDevlog,
  createDevlogComment,
  deleteDevlog,
  deleteDevlogComment,
  dislikeDevlogComment,
  getDevlog,
  getDevlogComments,
  getDevlogs,
  likeDevlog,
  likeDevlogComment,
  updateDevlog,
} from "../controllers/devlog.controller.js";

const router = express.Router();

// All devlog routes require authentication
router.use(protectRoute);

// --- MAIN DEVLOG FEED ---
router.get("/", getDevlogs);

// --- ADMIN ACTIONS ---
// Grouped together to clearly see which routes are protected by isAdmin
router.post("/", isAdmin, createDevlog);
router.put("/:id", isAdmin, updateDevlog);
router.delete("/:id", isAdmin, deleteDevlog);

// --- DEVLOG INTERACTIONS ---
router.post("/:id/like", likeDevlog);

// --- COMMENT MANAGEMENT ---
router.get("/:id/comments", getDevlogComments);
router.post("/:id/comments", createDevlogComment);
router.delete("/:id/comments/:commentId", deleteDevlogComment);

// --- COMMENT INTERACTIONS ---
router.post("/:id/comments/:commentId/like", likeDevlogComment);
router.post("/:id/comments/:commentId/dislike", dislikeDevlogComment);

// --- SPECIFIC DEVLOG (Parameterized) ---
// Placed at bottom to avoid intercepting specific sub-paths
router.get("/:id", getDevlog);

export default router;
