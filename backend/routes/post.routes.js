import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  getUserPosts,
  getFollowingPosts,
  getLikedPosts,
  getAllPosts,
  likeUnlikePost,
  createPost,
  deletePost,
  commentOnPost,
  getPost,
  deleteComment,
  repostPost,
  checkIfUserReposted,
} from "../controllers/post.controllers.js";

const router = express.Router();

router.get("/all", protectRoute, getAllPosts);
router.get("/following", protectRoute, getFollowingPosts);

router.get("/likes/:id", protectRoute, getLikedPosts);
router.get("/user/:username", protectRoute, getUserPosts);
router.post("/create", protectRoute, createPost);
router.post("/like/:id", protectRoute, likeUnlikePost);
router.post("/comment/:id", protectRoute, commentOnPost);
router.delete("/:id", protectRoute, deletePost);
router.get("/:id", protectRoute, getPost);
router.delete("/comment/:postId/:commentId", protectRoute, deleteComment)

router.post("/repost/:postId", protectRoute, repostPost);
router.get("/checkrepost/:originalPostId", protectRoute, checkIfUserReposted);



export default router;
