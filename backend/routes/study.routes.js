import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  endStudySession,
  getPomodoroSettings,
  getStudyActivityFeed,
  getStudyHistory,
  getUserBadges,
  updatePomodoroSettings,
} from "../controllers/study.controller.js";

const router = express.Router();

router.use(protectRoute);

// --- STUDY SESSIONS & HISTORY ---
router.post("/session/end", endStudySession);
router.get("/activity", getStudyActivityFeed);
router.get("/history", getStudyHistory);

// --- TASK MANAGEMENT ---

// --- SETTINGS & PREFERENCES ---
router.get("/users/settings/pomodoro", getPomodoroSettings);
router.post("/settings", updatePomodoroSettings);

// --- USER ACHIEVEMENTS ---
router.get("/badges/:userId", getUserBadges);

export default router;
