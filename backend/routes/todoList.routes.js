import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  createTodoList,
  getUserTodoLists,
  getTodoListById,
  updateTodoList,
  deleteTodoList,
  getFollowingTodoLists,
  getPublicTodoLists,
  getTodosInList,
  likeUnlikeTodoList,
} from "../controllers/todoList.controller.js";

const router = express.Router();

router.post("/", protectRoute, createTodoList);
router.get("/", protectRoute, getUserTodoLists);
router.get("/following", protectRoute, getFollowingTodoLists);
router.get("/public", getPublicTodoLists);
router.get("/:id", protectRoute, getTodoListById);
router.get("/:id/todos", protectRoute, getTodosInList);
router.put("/:id", protectRoute, updateTodoList);
router.delete("/:id", protectRoute, deleteTodoList);
router.post("/like/:id", protectRoute, likeUnlikeTodoList)


export default router;
