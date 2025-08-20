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

export const getUserTodoLists = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);

    const todoLists = await TodoList.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "owner",
        select: "username fullName",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({
        path: "todos",
        match: { completed: false }, // Filter for uncompleted todos
      });

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
      .populate({
        path: "owner",
        select: "username fullName",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({
        path: "todos",
        match: { completed: false }, // Filter for uncompleted todos
      })
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
      .populate({
        path: "owner",
        select: "username fullName",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({
        path: "todos",
        match: { completed: false }, // Filter for uncompleted todos
      })
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
    await newTodoList.save(); // Log the activity

    // const activity = new TodoActivity({
    //   user: req.user._id,
    //   action: "created_list",
    //   listId: newTodoList._id,
    //   listName: newTodoList.name,
    // });
    // await activity.save();
    res.status(201).json(newTodoList);
  } catch (error) {
    console.error("Error creating todo list:", error);
    res.status(500).json({ error: "Failed to create todo list" });
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
    todoList.name = name !== undefined ? name : todoList.name;
    todoList.description = description !== undefined ? description : todoList.description;
    todoList.isPublic = isPublic !== undefined ? isPublic : todoList.isPublic;
    todoList.color = color !== undefined ? color : todoList.color;
    todoList.icon = icon !== undefined ? icon : todoList.icon;
    todoList.settings = settings !== undefined ? settings : todoList.settings;

    await todoList.save();

    // const activity = new TodoActivity({
    //   user: req.user._id,
    //   action: "updated_list",
    //   listId: todoList._id,
    //   listName: todoList.name,
    // });
    // await activity.save();

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
    } // Log the activity before deletion

    await Todo.deleteMany({ todoList: req.params.id }); // Then delete the list itself

    await todoList.deleteOne();

    // const activity = new TodoActivity({
    //   user: req.user._id,
    //   action: "deleted_list",
    //   listId: todoList._id,
    //   listName: todoList.name,
    // });
    // await activity.save(); // Delete the associated todos first

    res.status(200).json({ message: "Todo list and its todos deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete todo list" });
  }
};

export const likeUnlikeTodoList = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id: listId } = req.params;

    const list = await TodoList.findById(listId);

    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }

    const userLikedList = list.likes.includes(userId);

    if (userLikedList) {
      await Promise.all([
        TodoList.updateOne({ _id: listId }, { $pull: { likes: userId } }),
        User.updateOne({ _id: userId }, { $pull: { likedTodoLists: listId } }),
      ]);

      const updatedLikes = list.likes.filter((id) => id.toString() !== userId.toString());
      res.status(200).json(updatedLikes);
    } else {
      list.likes.push(userId);
      await User.updateOne({ _id: userId }, { $push: { likedTodoLists: listId } });
      await list.save();

      res.status(200).json(list.likes);
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in likeUnlikeTodoList controller: ", error);
  }
};

