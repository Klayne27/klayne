import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  // endStudySession,
  getPomodoroSettings,
  getStudyActivityFeed,
  getStudyHistory,
  getUserBadges,
  updatePomodoroSettings,
} from "../controllers/study.controller.js";
import {
  cancelSession,
  endSession,
  getActiveSession,
  sessionHeartbeat,
  startSession,
} from "../controllers/pomodoro.controller.js";

const router = express.Router();

router.use(protectRoute);

// --- STUDY SESSIONS & HISTORY ---
// router.post("/session/end", endStudySession);
router.get("/activity", getStudyActivityFeed);
router.get("/history", getStudyHistory);

// In your pomodoro/study routes file, add:
router.post("/session/start", startSession);
router.get("/session/active", getActiveSession);
router.post("/session/end", endSession); // replaces old endStudySession
router.delete("/session/active", cancelSession);
router.post("/session/heartbeat", sessionHeartbeat);

// --- TASK MANAGEMENT ---

// --- SETTINGS & PREFERENCES ---
router.get("/users/settings/pomodoro", getPomodoroSettings);
router.post("/settings", updatePomodoroSettings);

// --- USER ACHIEVEMENTS ---
router.get("/badges/:userId", getUserBadges);

export default router;
