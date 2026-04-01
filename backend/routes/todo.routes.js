import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  completeTodo,
  createTodo,
  deleteTodo,
  getActiveTodosCount,
  getCompletedTodos,
  getCompletedTodosCount,
  getCompletedTodosWithDates,
  getFollowingTodos,
  getMyActivities,
  getPublicCompletedTodos,
  getPublicTodos,
  getTodoById,
  getUserTodos,
  updateTodo,
} from "../controllers/todo.controller.js";

const router = express.Router();

// --- PROTECTED ROUTES ---
router.use(protectRoute);

router.post("/", createTodo);
router.get("/", getUserTodos);
router.get("/activities", getMyActivities);
router.get("/following", getFollowingTodos);
router.get("/public", getPublicTodos);

// --- FILTERS & COMPLETED STATE ---
router.get("/completed", getCompletedTodos);
router.get("/public-completed", getPublicCompletedTodos);

// --- STATS & GOALS ---
router.get("/active-count", getActiveTodosCount);
router.get("/completed-count", getCompletedTodosCount);
router.get("/completed-goal", getCompletedTodosWithDates);

// --- INDIVIDUAL TODO OPERATIONS ---
router.get("/:id", getTodoById);
router.put("/:id", updateTodo);
router.delete("/:id", deleteTodo);
router.put("/complete/:id", completeTodo);

export default router;
