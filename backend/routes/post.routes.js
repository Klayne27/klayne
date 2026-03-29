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

router.post("/create", protectRoute, createPost);
router.put("/edit/:id", protectRoute, editPost);

router.post("/:id/reply", protectRoute, createReply);
router.get("/:id/replies", protectRoute, getPostReplies);
router.get("/:id/thread", protectRoute, getPostThread);

router.delete("/:id", protectRoute, deletePost);
router.get("/history/:id", protectRoute, getPostHistory);

router.post("/like/:id", protectRoute, likeUnlikePost);
router.post("/repost/:postId", protectRoute, repostPost);
router.post("/bookmark/:id", protectRoute, toggleBookmark);
router.post("/:postId/vote", protectRoute, voteOnPoll);
router.post("/pin/:id", protectRoute, pinUnpinPost);
router.delete("/pin/:id", protectRoute, pinUnpinPost);

router.get("/all", protectRoute, getAllPosts);
router.get("/ic", protectRoute, getICPosts);

router.get("/likes/:username", protectRoute, getLikedPosts);
router.get("/replies/:username", protectRoute, getUserReplies);

router.get("/following", protectRoute, getFollowingPosts);
router.get("/bookmarked", protectRoute, getBookmarkedPosts);
router.get("/check-repost/:originalPostId", protectRoute, checkIfUserReposted);
router.get("/profile/:username/pinned-posts", protectRoute, getPinnedPosts);

router.get("/scheduled", protectRoute, getScheduledPosts);
router.get("/user/:username", protectRoute, getUserPosts);
router.post("/vent", protectRoute, createVentPost);
router.get("/vent", protectRoute, getVentPosts);

router.get("/:id", protectRoute, getPost);

router.put("/scheduled/:id", protectRoute, updateScheduledPost);
router.post("/scheduled/bulk-delete", protectRoute, deleteMultipleScheduledPosts);

router.post("/mark-as-read", protectRoute, markFeedPostsAsRead);
router.post("/mark-as-read/vent", protectRoute, markFeedVentPostsAsRead);
router.post("/mark-as-read/ic", protectRoute, markFeedICPostsAsRead);

export default router;
