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
} from "../controllers/user.controllers.js";

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


export default router;
