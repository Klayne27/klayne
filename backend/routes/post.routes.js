import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  createPost,
  deletePost,
  likeUnlikePost,
  getAllPosts,
  getLikedPosts,
  getFollowingPosts,
  getUserPosts,
  getPost,
  repostPost,
  checkIfUserReposted,
  toggleBookmark,
  getBookmarkedPosts,
  voteOnPoll,
  pinUnpinPost,
  getPinnedPosts,
} from "../controllers/post.controllers.js";

const router = express.Router();

router.post("/create", protectRoute, createPost);
router.delete("/:id", protectRoute, deletePost);

router.post("/like/:id", protectRoute, likeUnlikePost); 
router.get("/bookmarked", protectRoute, getBookmarkedPosts);

router.get("/all", protectRoute, getAllPosts);
router.get("/likes/:id", protectRoute, getLikedPosts);
router.get("/following", protectRoute, getFollowingPosts);
router.get("/user/:username", protectRoute, getUserPosts);
router.get("/:id", protectRoute, getPost);

router.post("/repost/:postId", protectRoute, repostPost);
router.get("/check-repost/:originalPostId", protectRoute, checkIfUserReposted);

router.post("/bookmark/:id", protectRoute, toggleBookmark);

router.post("/:postId/vote", protectRoute, voteOnPoll);

router.post("/pin/:id", protectRoute, pinUnpinPost); 
router.delete("/pin/:id", protectRoute, pinUnpinPost);

router.get("/profile/:username/pinned-posts", protectRoute, getPinnedPosts); // Assuming protectRoute is needed



export default router;
