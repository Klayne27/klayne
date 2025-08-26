import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  endStudySession,
  getStudyActivityFeed,
  getPomodoroSettings,
  getUserBadges,
  updatePomodoroSettings,
} from "../controllers/study.controllers.js";

const router = express.Router();

router.post("/session/end", protectRoute, endStudySession);
router.get("/activity", protectRoute, getStudyActivityFeed);
router.post("/settings", protectRoute, updatePomodoroSettings);
router.get("/badges/:userId", protectRoute, getUserBadges);
router.get("/users/settings/pomodoro", protectRoute, getPomodoroSettings);

export default router;
