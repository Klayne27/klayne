import express from "express";
import {
  getMe,
  login,
  logout,
  signup,
  googleAuth,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controllers.js";
import { protectRoute } from "../middleware/protectRoute.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

const commonRateLimitHandler = (req, res) => {
  const message = req.rateLimit?.message || "Too many requests, please try again later.";
  res.status(429).json({ error: message });
};

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many signup attempts, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
  handler: commonRateLimitHandler,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
  handler: commonRateLimitHandler,
});

router.get("/me", protectRoute, getMe);
router.post("/signup", signupLimiter, signup);
router.post("/login", loginLimiter, login);

// router.post("/signup", signup);
// router.post("/login", login);

router.post("/logout", logout);
router.post("/google", googleAuth);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);


export default router;
