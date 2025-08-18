import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { getMyActivities } from "../controllers/todoActivity.controllers.js";

const router = express.Router();

router.get("/", protectRoute, getMyActivities);

export default router;
