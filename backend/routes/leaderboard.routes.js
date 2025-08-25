import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  getMonthlyLeaderboard,
  getPreviousWinners,
  getTotalLeaderboard,
} from "../controllers/leaderboard.controllers.js";

const router = express.Router();

router.get("/total", protectRoute, getTotalLeaderboard);
router.get("/monthly", protectRoute, getMonthlyLeaderboard);
router.get("/previous-winners", protectRoute, getPreviousWinners)

export default router;
