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
  getLiveSessions,
  getServerTime,
  pauseSession,
  sessionHeartbeat,
  startSession,
} from "../controllers/pomodoro.controller.js";

const router = express.Router();

// --- STUDY SESSIONS & HISTORY ---
// router.post("/session/end", endStudySession);
router.get("/activity", protectRoute, getStudyActivityFeed);
router.get("/history", protectRoute, getStudyHistory);

// In your pomodoro/study routes file, add:
router.post("/session/start", protectRoute, startSession);
router.get("/session/active", protectRoute, getActiveSession);
router.post("/session/end", protectRoute, endSession); // replaces old endStudySession
router.post("/session/pause", protectRoute, pauseSession);
router.delete("/session/active", protectRoute, cancelSession);
router.post("/session/heartbeat", protectRoute, sessionHeartbeat);

router.get("/sessions/live", protectRoute, getLiveSessions);
router.get("/server-time",   getServerTime);           // no auth needed
// --- TASK MANAGEMENT ---

// --- SETTINGS & PREFERENCES ---
router.get("/users/settings/pomodoro", protectRoute, getPomodoroSettings);
router.post("/settings", protectRoute, updatePomodoroSettings);

// --- USER ACHIEVEMENTS ---
router.get("/badges/:userId", protectRoute, getUserBadges);

export default router;
