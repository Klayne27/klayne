import express from "express";
import { getStatus, subscribe } from "../controllers/push.controller.js";
import { protectRoute } from "../middleware/protectRoute.js";

const router = express.Router();

router.post("/subscribe", protectRoute, subscribe);
router.get("/status", protectRoute, getStatus);

export default router;
