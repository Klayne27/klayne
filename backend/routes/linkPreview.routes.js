// backend/routes/linkPreview.routes.js
import express from "express";
import { getLinkPreview } from "../controllers/linkPreview.controller.js";
import { protectRoute } from "../middleware/protectRoute.js";

const router = express.Router();
router.get("/", protectRoute, getLinkPreview);
export default router;
