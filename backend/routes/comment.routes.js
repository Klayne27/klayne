import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  createComment,
  getComments,
  replyToComment,
  likeUnlikeComment,
  deleteComment,
} from "../controllers/comment.controllers.js";

const router = express.Router();


router.get("/:postId/comments", protectRoute, getComments);
router.get("/:postId/comments/:parentCommentId/replies", protectRoute, getComments);
router.post("/:postId", protectRoute, createComment);
router.post("/:postId/:parentCommentId/reply", protectRoute, replyToComment);
router.post("/:commentId/like", protectRoute, likeUnlikeComment);
router.delete("/:commentId", protectRoute, deleteComment);

export default router;
