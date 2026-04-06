import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  getBoardPosts,
  getBoardPost,
  createBoardPost,
  deleteBoardPost,
  reactToBoardPost,
  getBoardComments,
  createBoardComment,
  deleteBoardComment,
  reactToBoardComment,
  editBoardComment,
  editBoardPost,
} from "../controllers/board.controller.js";

const router = express.Router();

router.get("/", protectRoute, getBoardPosts);
router.get("/:id", protectRoute, getBoardPost);
router.put("/:id", protectRoute, editBoardPost);
router.post("/", protectRoute, createBoardPost);
router.delete("/:id", protectRoute, deleteBoardPost);
router.post("/:id/react", protectRoute, reactToBoardPost);

router.get("/:id/comments", protectRoute, getBoardComments);
router.post("/:id/comments", protectRoute, createBoardComment);
router.delete("/comments/:commentId", protectRoute, deleteBoardComment);
router.post("/comments/:commentId/react", protectRoute, reactToBoardComment);
router.put("/comments/:commentId", protectRoute, editBoardComment);

export default router;
