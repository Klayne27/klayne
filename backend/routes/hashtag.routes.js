import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  getTrendingHashtags,
  getPostsByHashtag,
  getPanelTrendingHashtags,
} from "../controllers/hashtag.controller.js";

const router = express.Router();

router.get("/trending", protectRoute, getTrendingHashtags);
router.get("/panel-trending", getPanelTrendingHashtags); // New specific route
router.get("/:tag/posts", protectRoute, getPostsByHashtag);

export default router;
