import express from "express";
import {
  getTodayWordle,
  getWordleAllTimeLeaderboard,
  getWordleDailyLeaderboard,
  getWordleHistory,
  getWordleUserStats,
  submitWordleGuess,
} from "../controllers/wordle.controller.js";
import { protectRoute } from "../middleware/protectRoute.js";

const router = express.Router();

router.use(protectRoute);

router.get("/today", getTodayWordle);
router.get("/stats", getWordleUserStats);
router.post("/guess", submitWordleGuess);
router.get("/leaderboard/daily", getWordleDailyLeaderboard);
router.get("/leaderboard/all-time", getWordleAllTimeLeaderboard);
router.get("/history", getWordleHistory);

export default router;
