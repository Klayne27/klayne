import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  getDevlogs,
  getDevlog,
  createDevlog,
  updateDevlog,
  deleteDevlog,
  likeDevlog,
  getDevlogComments,
  createDevlogComment,
  deleteDevlogComment,
  likeDevlogComment,
  dislikeDevlogComment,
} from "../controllers/devlog.controller.js";
import { isAdmin } from "../middleware/isAdmin.js";

const router = express.Router();

// ── Devlog CRUD ───────────────────────────────────────────────────────────────
router.get("/", protectRoute, getDevlogs);
router.get("/:id", protectRoute, getDevlog);
router.post("/", protectRoute, isAdmin, createDevlog);
router.put("/:id", protectRoute, isAdmin, updateDevlog);
router.delete("/:id", protectRoute, isAdmin, deleteDevlog);

// ── Likes ─────────────────────────────────────────────────────────────────────
router.post("/:id/like", protectRoute, likeDevlog);

// ── Comments ──────────────────────────────────────────────────────────────────
router.get("/:id/comments", protectRoute, getDevlogComments);
router.post("/:id/comments", protectRoute, createDevlogComment);
router.delete("/:id/comments/:commentId", protectRoute, deleteDevlogComment);
router.post("/:id/comments/:commentId/like", protectRoute, likeDevlogComment);
router.post("/:id/comments/:commentId/dislike", protectRoute, dislikeDevlogComment);

export default router;
