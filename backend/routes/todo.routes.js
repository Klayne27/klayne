import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  completeTodo,
  createTodo,
  deleteTodo,
  getCompletedTodos,
  getFollowingTodos,
  getMyActivities,
  getPublicCompletedTodos,
  getPublicTodos,
  getTodoById,
  getUserTodos,
  updateTodo,
} from "../controllers/todo.controllers.js";

const router = express.Router();

router.post("/", protectRoute, createTodo);
router.get("/", protectRoute, getUserTodos);
router.get("/public", getPublicTodos);
router.get("/completed", protectRoute, getCompletedTodos);
router.get("/following", protectRoute, getFollowingTodos);
router.get("/activities", protectRoute, getMyActivities);
router.get("/public-completed", protectRoute, getPublicCompletedTodos);

router.get("/:id", protectRoute, getTodoById);
router.put("/:id", protectRoute, updateTodo);
router.put("/:id/complete", protectRoute, completeTodo);
router.delete("/:id", protectRoute, deleteTodo);
router.put("/:id", protectRoute, updateTodo);

export default router;
