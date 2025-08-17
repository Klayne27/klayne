import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  completeTodo,
  createTodo,
  deleteTodo,
  getCompletedTodos,
  getFollowingTodos,
  getPublicTodos,
  getTodoById,
  getUserTodos,
  updateTodo,
} from "../controllers/todo.controllers.js";

const router = express.Router();

router.post("/", protectRoute, createTodo);
router.get("/", protectRoute, getUserTodos);
router.get("/public", getPublicTodos);
router.get("/following", protectRoute, getFollowingTodos);
router.get("/:id", protectRoute, getTodoById);
router.put("/:id", protectRoute, updateTodo);
router.put("/:id/complete", protectRoute, completeTodo);
router.delete("/:id", protectRoute, deleteTodo);
router.get("/completed", protectRoute, getCompletedTodos);


export default router;
