import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  getMonthlyLeaderboard,
  getPreviousWeekWinners,
  getPreviousMonthWinners,
  getTotalLeaderboard,
  getWeeklyLeaderboard,
} from "../controllers/leaderboard.controller.js";

const router = express.Router();

router.get("/total", protectRoute, getTotalLeaderboard);
router.get("/monthly", protectRoute, getMonthlyLeaderboard);
router.get("/monthly/previous-winners", protectRoute, getPreviousMonthWinners)
router.get("/weekly", protectRoute, getWeeklyLeaderboard);
router.get("/weekly/previous-winners", protectRoute, getPreviousWeekWinners);

export default router;
