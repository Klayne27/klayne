import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { endStudySession, getStudyActivityFeed,getPomodoroSettings, getUserBadges, startStudySession, updatePomodoroSettings } from "../controllers/study.controllers.js";


const router = express.Router();

router.post("/session/start", protectRoute, startStudySession);
router.post("/session/end", protectRoute, endStudySession);
// router.get("/sessions/:userId", protectRoute, getUserStudySessions);
router.get("/activity", protectRoute, getStudyActivityFeed);
// router.get("/hours-leaderboard", protectRoute, getLeaderboard);
// router.get("/session-count-leaderboard", protectRoute, getSessionCountLeaderboard);
router.post("/settings", protectRoute, updatePomodoroSettings);
router.get("/badges/:userId", protectRoute, getUserBadges);
router.get("/users/settings/pomodoro", protectRoute, getPomodoroSettings); // <-- The new route


export default router;
