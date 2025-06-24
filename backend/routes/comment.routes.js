// src/routes/comment.routes.js
import express from "express";
import { protectRoute } from "../middleware/protectRoute.js"; // Assuming this path
import {
  createComment,
  getComments,
  replyToComment,
  likeUnlikeComment,
  deleteComment,
} from "../controllers/comment.controllers.js";

const router = express.Router();

// 1. Route to get TOP-LEVEL comments for a post
// Example: GET /api/comments/60f8b1e4c7a5f60015f6b8e1/comments
router.get("/:postId/comments", getComments);

// 2. Route to get REPLIES for a specific parent comment on a post
// Example: GET /api/comments/60f8b1e4c7a5f60015f6b8e1/comments/60f8b1e4c7a5f60015f6b8e2/replies
router.get("/:postId/comments/:parentCommentId/replies", getComments);

// Create a new top-level comment on a post
// POST /api/comments/:postId
router.post("/:postId", protectRoute, createComment);

// Reply to an existing comment
// POST /api/comments/:postId/:parentCommentId/reply
router.post("/:postId/:parentCommentId/reply", protectRoute, replyToComment);

// Like or unlike a comment
// POST /api/comments/:commentId/like
router.post("/:commentId/like", protectRoute, likeUnlikeComment);

// Delete a comment (and its replies)
// DELETE /api/comments/:commentId
router.delete("/:commentId", protectRoute, deleteComment);

export default router;
