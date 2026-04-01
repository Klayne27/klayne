import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  createTodoList,
  deleteTodoList,
  getFollowingTodoLists,
  getPublicTodoLists,
  getTodoListById,
  getTodosInList,
  getUserTodoLists,
  likeUnlikeTodoList,
  updateTodoList,
} from "../controllers/todoList.controller.js";

const router = express.Router();

router.use(protectRoute);

// --- COLLECTION LISTS ---
router.get("/", getUserTodoLists);
router.get("/public", getPublicTodoLists);
router.get("/following", getFollowingTodoLists);

// --- LIST MANAGEMENT ---
router.post("/", createTodoList);
router.post("/like/:id", likeUnlikeTodoList);
router.get("/todos/:id", getTodosInList);

// --- SPECIFIC LIST CRUD ---
router.get("/:id", getTodoListById);
router.put("/:id", updateTodoList);
router.delete("/:id", deleteTodoList);

export default router;
