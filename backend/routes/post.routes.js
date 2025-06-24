// src/routes/post.routes.js
import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  createPost,
  deletePost,
  // REMOVED commentOnPost, deleteComment, likeUnlikeComment
  likeUnlikePost, // Keep this as it's for posts, not comments
  getAllPosts,
  getLikedPosts,
  getFollowingPosts,
  getUserPosts,
  getPost,
  repostPost,
  checkIfUserReposted,
} from "../controllers/post.controllers.js";

const router = express.Router();

router.post("/create", protectRoute, createPost);
router.delete("/:id", protectRoute, deletePost);

// REMOVED old comment routes
// router.post("/comment/:id", protectRoute, commentOnPost);
// router.delete("/comment/:postId/:commentId", protectRoute, deleteComment);
// router.post("/comment/:postId/:commentId/like", protectRoute, likeUnlikeComment);

router.post("/like/:id", protectRoute, likeUnlikePost); // This route is for liking posts, so it remains

router.get("/all", protectRoute, getAllPosts); // You might want to protect this based on your app's logic
router.get("/likes/:id", protectRoute, getLikedPosts);
router.get("/following", protectRoute, getFollowingPosts);
router.get("/user/:username", protectRoute, getUserPosts);
router.get("/:id", protectRoute, getPost);

router.post("/repost/:postId", protectRoute, repostPost);
router.get("/check-repost/:originalPostId", protectRoute, checkIfUserReposted);

export default router;
