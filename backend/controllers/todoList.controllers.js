import TodoList from "../models/todoList.model.js";
import Todo from "../models/todo.model.js";
import User from "../models/user.model.js";
// import mongoose from "mongoose";

const getPaginationParams = (req) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10; // default to 10 items per page
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// const getTodosForListPipeline = [
//   {
//     // The $lookup stage to "join" with the 'todos' collection
//     $lookup: {
//       from: "todos", // The name of the collection to join with
//       localField: "_id", // Field from the input documents (TodoList)
//       foreignField: "todoList", // Field from the documents of the "from" collection (Todo)
//       as: "todos", // The name of the new array field to add to the TodoList documents
//     },
//   },
//   {
//     // Optional: You might want to sort the todos within each list
//     $addFields: {
//       todos: {
//         $sortArray: {
//           input: "$todos",
//           sortBy: { createdAt: -1 }, // Sort todos by newest first
//         },
//       },
//     },
//   },
// ];

export const createTodoList = async (req, res) => {
  try {
    const { name, description, isPublic, color, icon } = req.body;
    const newTodoList = new TodoList({
      name,
      description,
      owner: req.user._id,
      isPublic,
      color,
      icon,
    });
    await newTodoList.save();
    res.status(201).json(newTodoList);
  } catch (error) {
    console.error("Error creating todo list:", error);
    res.status(500).json({ error: "Failed to create todo list" });
  }
};

export const getUserTodoLists = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);

    const todoLists = await TodoList.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("owner", "username fullName profileImg") // 👈 Populate the owner
      .populate("todos");

    // Pagination counting remains the same
    const totalCount = await TodoList.countDocuments({ owner: req.user._id });
    const hasNextPage = skip + todoLists.length < totalCount;

    res.status(200).json({
      data: todoLists, // This data now includes a 'todos' array in each list object
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      hasNextPage: hasNextPage,
    });
  } catch (error) {
    console.error("Failed to fetch todo lists:", error); // Log the actual error
    res.status(500).json({ error: "Failed to fetch todo lists" });
  }
};

export const getFollowingTodoLists = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const user = await User.findById(req.user._id);
    const following = user.following;

    const todoLists = await TodoList.find({
      owner: { $in: following },
      isPublic: true,
    })
      .populate("owner", "username fullName profileImg")
      .populate("todos") // <-- Simply add this to populate the virtual field
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await TodoList.countDocuments({
      owner: { $in: following },
      isPublic: true,
    });
    const hasNextPage = skip + todoLists.length < totalCount;

    res.status(200).json({
      data: todoLists,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      hasNextPage: hasNextPage,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch following's todo lists" });
  }
};

export const getPublicTodoLists = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);

    const todoLists = await TodoList.find({ isPublic: true })
      .populate("owner", "username fullName profileImg")
      .populate("todos") // <-- And add it here as well
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await TodoList.countDocuments({ isPublic: true });
    const hasNextPage = skip + todoLists.length < totalCount;

    res.status(200).json({
      data: todoLists,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      hasNextPage: hasNextPage,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch public todo lists" });
  }
};

export const getTodoListById = async (req, res) => {
  try {
    const todoList = await TodoList.findById(req.params.id);
    if (!todoList) {
      return res.status(404).json({ error: "Todo list not found" });
    }
    // Check if user is owner or list is public
    if (todoList.owner.toString() !== req.user._id.toString() && !todoList.isPublic) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.status(200).json(todoList);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch todo list" });
  }
};

export const getTodosInList = async (req, res) => {
  try {
    const todoList = await TodoList.findById(req.params.id);
    if (!todoList) {
      return res.status(404).json({ error: "Todo list not found" });
    }
    if (todoList.owner.toString() !== req.user._id.toString() && !todoList.isPublic) {
      return res.status(403).json({ error: "Access denied" });
    }
    const todos = await Todo.find({ todoList: req.params.id }).sort({ createdAt: 1 });
    res.status(200).json(todos);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch todos" });
  }
};

export const updateTodoList = async (req, res) => {
  try {
    const { name, description, isPublic, color, icon, settings } = req.body;
    const todoList = await TodoList.findById(req.params.id);
    if (!todoList) {
      return res.status(404).json({ error: "Todo list not found" });
    }
    if (todoList.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }
    todoList.name = name ?? todoList.name;
    todoList.description = description ?? todoList.description;
    todoList.isPublic = isPublic ?? todoList.isPublic;
    todoList.color = color ?? todoList.color;
    todoList.icon = icon ?? todoList.icon;
    todoList.settings = settings ?? todoList.settings;

    await todoList.save();
    res.status(200).json(todoList);
  } catch (error) {
    res.status(500).json({ error: "Failed to update todo list" });
  }
};

export const deleteTodoList = async (req, res) => {
  try {
    const todoList = await TodoList.findById(req.params.id);
    if (!todoList) {
      return res.status(404).json({ error: "Todo list not found" });
    }
    if (todoList.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }
    await Todo.deleteMany({ todoList: req.params.id });

    await todoList.deleteOne();
    res.status(200).json({ message: "Todo list and its todos deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete todo list" });
  }
};
