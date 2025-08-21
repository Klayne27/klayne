import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  getLeaderboardStats,
  getMonthlyLeaderboard,
  getPreviousWinners,
  getTotalLeaderboard,
} from "../controllers/leaderboard.controllers.js";

const router = express.Router();

// Get total (all-time) leaderboard
router.get("/total", protectRoute, getTotalLeaderboard);

// Get monthly leaderboard
router.get("/monthly", protectRoute, getMonthlyLeaderboard);

// Get leaderboard statistics
router.get("/stats", protectRoute, getLeaderboardStats);

router.get("/previous-winners", protectRoute, getPreviousWinners)

export default router;
