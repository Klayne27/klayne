// routes/suggestion.routes.js
import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  submitSuggestion,
  getAllSuggestions,
  updateSuggestionStatus,
  deleteSuggestion,
} from "../controllers/suggestion.controller.js";
import { isAdmin } from "../middleware/isAdmin.js";

const router = express.Router();

router.post("/", protectRoute, submitSuggestion);
router.get("/", protectRoute, isAdmin, getAllSuggestions);
router.patch("/:id", protectRoute, isAdmin, updateSuggestionStatus);
router.delete("/:id", protectRoute, isAdmin, deleteSuggestion);

export default router;
