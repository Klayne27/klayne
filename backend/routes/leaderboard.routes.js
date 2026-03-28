import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  getMonthlyLeaderboard,
  getPreviousWeekWinners,
  getPreviousWinners,
  getTotalLeaderboard,
  getWeeklyLeaderboard,
} from "../controllers/leaderboard.controller.js";

const router = express.Router();

router.get("/total", protectRoute, getTotalLeaderboard);
router.get("/monthly", protectRoute, getMonthlyLeaderboard);
router.get("/previous-winners", protectRoute, getPreviousWinners)
router.get("/weekly", protectRoute, getWeeklyLeaderboard);
router.get("/weekly/previous-winners", protectRoute, getPreviousWeekWinners);

export default router;
