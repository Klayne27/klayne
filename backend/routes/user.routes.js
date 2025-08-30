import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  updateUser,
  getSuggestedUsers,
  followUnfollowUser,
  getUserProfile,
  getFollowers,
  getFollowingUsers,
  deleteUserAccount,
  searchUsers,
  blockUnblockUser,
  adminDeleteUserAccount,
  getVacationModeStatus,
  toggleVacationMode,
  toggleLikedFeedPrivacy,
} from "../controllers/user.controllers.js";
import { isAdmin } from "../middleware/isAdmin.js";

const router = express.Router();

router.get("/profile/:username", protectRoute, getUserProfile);
router.get("/suggested", protectRoute, getSuggestedUsers);
router.post("/follow/:id", protectRoute, followUnfollowUser);
router.post("/update", protectRoute, updateUser);
router.get("/followers/:id", protectRoute, getFollowers);
router.get("/following/:id", protectRoute, getFollowingUsers);
router.delete("/delete/:id", protectRoute, deleteUserAccount);
router.get("/search", protectRoute, searchUsers);
router.post("/block/:id", protectRoute, blockUnblockUser);
router.get("/vacation-mode", protectRoute, getVacationModeStatus);
router.put("/vacation-mode", protectRoute, toggleVacationMode);
router.put("/toggle-liked-feed-privacy", protectRoute, toggleLikedFeedPrivacy);

router.delete("/admin/delete/:id", protectRoute, isAdmin, adminDeleteUserAccount);

export default router;
