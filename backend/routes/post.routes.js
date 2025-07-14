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
  getPost, // getPost will be at the end of GETs
  repostPost,
  checkIfUserReposted,
  toggleBookmark,
  getBookmarkedPosts,
  voteOnPoll,
  pinUnpinPost,
  getPinnedPosts,
  updateScheduledPost,
  getScheduledPosts,
  deleteScheduledPost,
  deleteMultipleScheduledPosts,
} from "../controllers/post.controllers.js";

const router = express.Router();

router.post("/create", protectRoute, createPost);
router.delete("/:id", protectRoute, deletePost);

router.post("/like/:id", protectRoute, likeUnlikePost);
router.post("/repost/:postId", protectRoute, repostPost);
router.post("/bookmark/:id", protectRoute, toggleBookmark);
router.post("/:postId/vote", protectRoute, voteOnPoll);
router.post("/pin/:id", protectRoute, pinUnpinPost);
router.delete("/pin/:id", protectRoute, pinUnpinPost); // Make sure delete pin is okay here. It's a different HTTP method so order relative to other POSTs/GETs isn't as strict.

// --- ALL SPECIFIC GET ROUTES SHOULD COME FIRST ---

router.get("/all", protectRoute, getAllPosts); // /api/posts/all
router.get("/likes/:id", protectRoute, getLikedPosts); // /api/posts/likes/:id
router.get("/following", protectRoute, getFollowingPosts); // /api/posts/following
router.get("/bookmarked", protectRoute, getBookmarkedPosts); // /api/posts/bookmarked
router.get("/check-repost/:originalPostId", protectRoute, checkIfUserReposted); // /api/posts/check-repost/:originalPostId
router.get("/profile/:username/pinned-posts", protectRoute, getPinnedPosts); // /api/posts/profile/:username/pinned-posts

// !!! THESE ARE CRITICAL TO MOVE UP !!!
router.get("/scheduled", protectRoute, getScheduledPosts); // /api/posts/scheduled - Add protectRoute if it's protected
router.get("/user/:username", protectRoute, getUserPosts); // /api/posts/user/:username

// --- THEN, THE GENERIC ID ROUTE AT THE VERY END OF GETs ---
router.get("/:id", protectRoute, getPost); // /api/posts/:id - THIS MUST BE LAST AMONG GET ROUTES

// Update and Delete Scheduled posts
router.put("/scheduled/:id", protectRoute, updateScheduledPost); // Add protectRoute
router.delete("/scheduled/:id", protectRoute, deleteScheduledPost); // Add protectRoute
router.post("/scheduled/bulk-delete", protectRoute, deleteMultipleScheduledPosts);


export default router;
