import express from "express";
import {
  getDevlogs,
  getDevlog,
  updateDevlog,
  deleteDevlog,
  createDevlog,
} from "../controllers/devlog.controller.js";
import { isAdmin } from "../middleware/isAdmin.js";
import { protectRoute } from "../middleware/protectRoute.js";

const router = express.Router();

// Public reads (still requires login)
router.get("/", protectRoute, getDevlogs);
router.get("/:id", protectRoute, getDevlog);

// Admin writes
router.post("/", protectRoute, isAdmin, createDevlog);
router.put("/:id", protectRoute, isAdmin, updateDevlog);
router.delete("/:id", protectRoute, isAdmin, deleteDevlog);

export default router;
