import express from "express";
import { getImageById } from "../controllers/image.controller.js";
import { protectRoute } from "../middleware/protectRoute.js";

const router = express.Router();
router.get("/:imageId", protectRoute, getImageById);
export default router;
