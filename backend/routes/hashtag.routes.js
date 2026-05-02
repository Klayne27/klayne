import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  getTrendingHashtags,
  getPostsByHashtag,
} from "../controllers/hashtag.controller.js";

const router = express.Router();

router.get("/trending", protectRoute, getTrendingHashtags);
router.get("/:tag/posts", protectRoute, getPostsByHashtag);

export default router;
