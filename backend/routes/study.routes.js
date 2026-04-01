import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  createStudyTask,
  deleteStudyTask,
  endStudySession,
  getPomodoroSettings,
  getStudyActivityFeed,
  getStudyHistory,
  getUserBadges,
  getUserStudyTasks,
  logStudyTime,
  updatePomodoroSettings,
} from "../controllers/study.controller.js";

const router = express.Router();

router.use(protectRoute);

// --- STUDY SESSIONS & HISTORY ---
router.post("/session/end", endStudySession);
router.get("/activity", getStudyActivityFeed);
router.get("/history", getStudyHistory);

// --- TASK MANAGEMENT ---
router.get("/tasks", getUserStudyTasks);
router.post("/tasks", createStudyTask);
router.post("/tasks/log-time", logStudyTime);
router.delete("/tasks/:id", deleteStudyTask);

// --- SETTINGS & PREFERENCES ---
router.get("/users/settings/pomodoro", getPomodoroSettings);
router.post("/settings", updatePomodoroSettings);

// --- USER ACHIEVEMENTS ---
router.get("/badges/:userId", getUserBadges);

export default router;
