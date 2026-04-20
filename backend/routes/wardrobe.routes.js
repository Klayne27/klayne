import express from "express";
import { equipItem, getInventory } from "../controllers/wardrobe.controller.js";
import { protectRoute } from "../middleware/protectRoute.js";

const router = express.Router();

router.get("/inventory", protectRoute, getInventory);
router.post("/equip", protectRoute, equipItem);

export default router;
