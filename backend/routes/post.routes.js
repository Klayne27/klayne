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
  updateScheduledPost,
  getScheduledPosts,
  deleteMultipleScheduledPosts,
  markFeedPostsAsRead,
  createVentPost,
  getVentPosts,
  markFeedVentPostsAsRead,
  editPost,
  getPostHistory,
  getICPosts,
  createReply,
  getPostReplies,
  getPostThread,
  getUserReplies,
  markFeedICPostsAsRead,
} from "../controllers/post.controller.js";

const router = express.Router();

// All routes below require authentication
router.use(protectRoute);

// --- CORE CRUD & POST ACTIONS ---
router.post("/create", createPost);
router.get("/all", getAllPosts);
router.put("/edit/:postId", editPost);
router.get("/history/:postId", getPostHistory);

// --- SOCIAL INTERACTIONS ---
router.post("/like/:postId", likeUnlikePost);
router.post("/repost/:postId", repostPost);
router.post("/bookmark/:postId", toggleBookmark);
router.post("/vote/:postId", voteOnPoll);
router.get("/check-repost/:originalPostId", checkIfUserReposted);

// --- REPLIES & THREADS ---
router.post("/reply/:parentId", createReply);
router.get("/replies/:postId", getPostReplies);
router.get("/thread/:postId", getPostThread);

// --- FEED & FILTERED LISTS ---
router.get("/following", getFollowingPosts);
router.get("/bookmarked", getBookmarkedPosts);
router.get("/ic", getICPosts);
router.get("/vent", getVentPosts);
router.post("/vent", createVentPost);

// --- USER SPECIFIC ROUTES ---
router.get("/user/:username", getUserPosts);
router.get("/likes/:username", getLikedPosts);
router.get("/replies/user/:username", getUserReplies); // Renamed slightly for clarity

// --- PINNED POSTS ---
router.get("/profile/:username/pinned-posts", getPinnedPosts);
router.route("/pin/:postId")
  .post(pinUnpinPost)
  .delete(pinUnpinPost);

// --- SCHEDULED POSTS ---
router.get("/scheduled", getScheduledPosts);
router.put("/scheduled/:postId", updateScheduledPost);
router.post("/scheduled/bulk-delete", deleteMultipleScheduledPosts);

router.get("/:postId", getPost); // Keep parameterized routes lower to avoid collision
router.delete("/:postId", deletePost);

// --- FEED MANAGEMENT (UTILITY) ---
router.post("/mark-as-read", markFeedPostsAsRead);
router.post("/mark-as-read/vent", markFeedVentPostsAsRead);
router.post("/mark-as-read/ic", markFeedICPostsAsRead);

export default router;
