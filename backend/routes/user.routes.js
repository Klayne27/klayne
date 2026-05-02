import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { isAdmin } from "../middleware/isAdmin.js";
import {
  adminDeleteUserAccount,
  blockUnblockUser,
  deleteUserAccount,
  followUnfollowUser,
  getFollowers,
  getFollowingUsers,
  getMuteStatus,
  getSuggestedUsers,
  getSuggestedUsersPage,
  getUserProfile,
  getUserStats,
  getVacationModeStatus,
  muteUser,
  searchUsers,
  toggleLikedFeedPrivacy,
  toggleVacationMode,
  unmuteUser,
  updateNameColor,
  updatePreferredBadge,
  updateStatusPreference,
  updateUser,
} from "../controllers/user.controller.js";

const router = express.Router();

router.use(protectRoute);

// --- PROFILE & SEARCH ---
router.get("/profile/:username", getUserProfile);
router.get("/search", searchUsers);
router.post("/update", updateUser);

// --- SOCIAL & RELATIONSHIPS ---
router.get("/suggested", getSuggestedUsers);
router.get("/suggested/all", getSuggestedUsersPage);
router.post("/follow/:userId", followUnfollowUser);
router.get("/followers/:userId", getFollowers);
router.get("/following/:userId", getFollowingUsers);
router.post("/block/:userToBlockId", blockUnblockUser);
router.get("/stats/:username", getUserStats);
router.post("/mute/:userId", protectRoute, muteUser);
router.delete("/mute/:userId", protectRoute, unmuteUser);
router.get("/mute/:userId", protectRoute, getMuteStatus);

// --- SETTINGS & PRIVACY ---
router.get("/vacation-mode", getVacationModeStatus);
router.put("/vacation-mode", toggleVacationMode);
router.put("/toggle-liked-feed-privacy", toggleLikedFeedPrivacy);
router.post("/update-preferred-badge", updatePreferredBadge);
router.put("/update-status-preference", updateStatusPreference);
router.put("/name-color", protectRoute, updateNameColor);


// --- ACCOUNT MANAGEMENT ---
router.delete("/delete/:userId", deleteUserAccount);

// --- ADMIN ONLY ---
router.delete("/admin/delete/:userIdToDelete", isAdmin, adminDeleteUserAccount);

export default router;
