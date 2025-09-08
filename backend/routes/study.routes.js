import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  endStudySession,
  getStudyActivityFeed,
  getPomodoroSettings,
  getUserBadges,
  updatePomodoroSettings,
  getUserStudyTasks,
  createStudyTask,
  deleteStudyTask,
  logStudyTime,
  getStudyHistory
} from "../controllers/study.controller.js";

const router = express.Router();

router.post("/session/end", protectRoute, endStudySession);
router.get("/activity", protectRoute, getStudyActivityFeed);
router.post("/settings", protectRoute, updatePomodoroSettings);
router.get("/badges/:userId", protectRoute, getUserBadges);
router.get("/users/settings/pomodoro", protectRoute, getPomodoroSettings);

// New Routes for Study Tasks (CRUD)
router.get("/tasks", protectRoute, getUserStudyTasks);
router.post("/tasks", protectRoute, createStudyTask);
router.delete("/tasks/:id", protectRoute, deleteStudyTask);

// New Route for logging time every second
router.post("/tasks/log-time", protectRoute, logStudyTime);

router.get("/history", protectRoute, getStudyHistory);

export default router;
