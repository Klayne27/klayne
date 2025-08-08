// routes/image.routes.js
import express from "express";
import { getImageById } from "../controllers/image.controllers.js";
import { protectRoute } from "../middleware/protectRoute.js";

const router = express.Router();
router.get("/:imageId", protectRoute, getImageById);
export default router;
