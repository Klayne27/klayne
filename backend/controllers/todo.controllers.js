import LevelUp from "../models/levelup.model.js";
import Todo from "../models/todo.model.js";
import TodoActivity from "../models/todoActivity.model.js";
import TodoList from "../models/todoList.model.js";
import User from "../models/user.model.js";

// utils/activity.utils.js
const buildListMeta = (listDoc) => {
  if (!listDoc) return { listId: null, todoList: null, listSnapshot: null };

  return {
    listId: listDoc._id,
    todoList: listDoc._id,
    listSnapshot: {
      _id: listDoc._id,
      name: listDoc.name,
      color: listDoc.color,
      icon: listDoc.icon,
    },
  };
};

const xpForLevel = (level) => {
  if (level <= 1) {
    return 500;
  }
  return Math.floor(300 + level * 200 + Math.pow(level - 1, 1.3) * 100);
};

// A new function you must create or update in your Todo controller
export const createTodo = async (req, res) => {
  try {
    const { title, description, todoListId, priority, dueDate } = req.body;

    // 1. Find the parent todo list
    const parentList = await TodoList.findById(todoListId);
    if (!parentList) {
      return res.status(404).json({ error: "Todo list not found" });
    }

    // 2. Create the new todo with the todoList field set
    const newTodo = new Todo({
      title,
      description,
      user: req.user._id,
      todoList: todoListId, // <-- Crucial: This links the todo to the list
      priority, // Add priority
      dueDate, // Add dueDate
    });
    await newTodo.save(); // Log the activity

    const activity = new TodoActivity({
      user: req.user._id,
      action: "created_todo",
      todoId: newTodo._id,
      todoTitle: newTodo.title,
      todoPriority: newTodo.priority,

      listId: parentList._id,
      todoList: parentList._id,

      listSnapshot: {
        _id: parentList._id,
        name: parentList.name,
        color: parentList.color,
        icon: parentList.icon,
      },
    });
    await activity.save();

    // 3. Update the parent todo list by pushing the new todo's ID
    await TodoList.findByIdAndUpdate(todoListId, {
      $push: { todos: newTodo._id }, // <-- Pushes the new todo ID into the array
      $inc: { totalTodos: 1 },
    });

    res.status(201).json(newTodo);
  } catch (error) {
    console.error("Error creating todo:", error);
    res.status(500).json({ error: "Failed to create todo" });
  }
};

export const getUserTodos = async (req, res) => {
  try {
    const todos = await Todo.find({ user: req.user._id });
    res.status(200).json(todos);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch todos" });
  }
};

export const getTodoById = async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    if (!todo) {
      return res.status(404).json({ error: "Todo not found" });
    }
    if (todo.user.toString() !== req.user._id.toString() && !todo.isPublic) {
      return res.status(403).json({ error: "Access denied" });
    }
    res.status(200).json(todo);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch todo" });
  }
};

export const getFollowingTodos = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const following = user.following;
    const todos = await Todo.find({
      user: { $in: following },
      isPublic: true,
      completed: false,
    })
      .populate("user", "username fullName profileImg")
      .sort({ createdAt: -1 });
    res.status(200).json(todos);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch following's todos" });
  }
};

export const getPublicTodos = async (req, res) => {
  try {
    const todos = await Todo.find({ isPublic: true, completed: false })
      .populate("user", "username fullName profileImg")
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json(todos);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch public todos" });
  }
};

// export const getPublicCompletedTodos = async (req, res) => {
//   try {
//     const todos = await Todo.find({ isPublic: true, completed: true })
//       .populate({
//         path: "user",
//         select: "username",
//         populate: { path: "profileImg", select: "imageUrl" },
//       })
//       .sort({ completedAt: -1 })

//     res.status(200).json(todos);
//   } catch (error) {
//     res.status(500).json({ error: "Failed to fetch public todos" });
//   }
// };

export const updateTodo = async (req, res) => {
  try {
    const { title, description, priority, category, dueDate, isPublic } = req.body;
    const todo = await Todo.findById(req.params.id).populate("todoList");
    if (!todo) {
      return res.status(404).json({ error: "Todo not found" });
    }
    if (todo.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    todo.title = title !== undefined ? title : todo.title;
    todo.description = description !== undefined ? description : todo.description;
    todo.priority = priority !== undefined ? priority : todo.priority;
    todo.category = category !== undefined ? category : todo.category;
    todo.dueDate = dueDate !== undefined ? dueDate : todo.dueDate;
    todo.isPublic = isPublic !== undefined ? isPublic : todo.isPublic;

    await todo.save();

    const activity = new TodoActivity({
      user: req.user._id,
      action: "updated_todo",
      todoId: todo._id,
      todoTitle: todo.title,
      todoPriority: todo.priority,
      ...buildListMeta(todo.todoList),
    });
    await activity.save();

    res.status(200).json(todo);
  } catch (error) {
    res.status(500).json({ error: "Failed to update todo" });
  }
};

export const completeTodo = async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id).populate("todoList");
    if (!todo) {
      return res.status(404).json({ error: "Todo not found" });
    }
    if (todo.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }
    if (todo.completed) {
      return res.status(400).json({ error: "Todo is already completed" });
    }
    todo.completed = true;
    todo.completedAt = new Date();

    if (todo.todoList && todo.todoList.isPublic) {
      todo.isPublic = true;
    }

    if (todo.todoList) {
      todo.completedFromList = {
        _id: todo.todoList._id,
        name: todo.todoList.name,
        color: todo.todoList.color,
        icon: todo.todoList.icon,
      };
    }

    await todo.save();

    const activity = new TodoActivity({
      user: req.user._id,
      action: "completed_todo",
      todoId: todo._id,
      todoTitle: todo.title,
      todoPriority: todo.priority,
      ...buildListMeta(todo.todoList),
    });
    await activity.save();

    if (todo.todoList) {
      await TodoList.findByIdAndUpdate(todo.todoList, {
        $inc: {
          completedTodos: 1,
          totalTodos: -1,
        },
      });
    }

    const user = await User.findById(req.user._id);
    if (user) {
      const xpRewards = {
        low: 25,
        medium: 50,
        high: 100,
        urgent: 200,
      };

      let xpToAdd = xpRewards[todo.priority] || 25;

      const parentTodoList = await TodoList.findById(todo.todoList);
      if (parentTodoList && parentTodoList.isPublic) {
        xpToAdd *= 2;
      }

      user.pomodoroXP += xpToAdd;

      let levelsGained = [];
      let xpNeededForCurrentLevel = xpForLevel(user.pomodoroLevel + 1);

      while (user.pomodoroXP >= xpNeededForCurrentLevel) {
        user.pomodoroXP -= xpNeededForCurrentLevel;
        user.pomodoroLevel += 1;
        levelsGained.push(user.pomodoroLevel);

        await LevelUp.create({
          user: user._id,
          newLevel: user.pomodoroLevel,
        });

        xpNeededForCurrentLevel = xpForLevel(user.pomodoroLevel + 1);
      }

      await user.save();

      // ⭐ Corrected response payload ⭐
      return res.status(200).json({
        todo,
        xpResult: {
          xpGained: xpToAdd, // The amount of XP gained
          finalXP: user.pomodoroXP, // The user's new total XP
          finalLevel: user.pomodoroLevel, // The user's new level
          levelsGained, // An array of levels gained, if any
        },
      });
    }

    // Fallback response if user is not found
    return res.status(200).json({ todo });
  } catch (error) {
    console.error("Error in completeTodo:", error);
    res.status(500).json({ error: "Failed to complete todo" });
  }
};

export const deleteTodo = async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id).populate("todoList");
    if (!todo) {
      return res.status(404).json({ error: "Todo not found" });
    }
    if (todo.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }
    const todoListId = todo.todoList;
    const wasCompleted = todo.completed;

    await todo.deleteOne();

    const activity = new TodoActivity({
      user: req.user._id,
      action: "deleted_todo",
      todoId: todo._id,
      todoTitle: todo.title,
      todoPriority: todo.priority,
      ...buildListMeta(todo.todoList),
    });
    await activity.save();

    // Decrement totalTodos and completedTodos (if applicable) for the associated list
    if (todoListId) {
      const update = { $inc: { totalTodos: -1 } };
      if (wasCompleted) {
        update.$inc.completedTodos = -1;
      }
      await TodoList.findByIdAndUpdate(todoListId, update);
    }

    res.status(200).json({ message: "Todo deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete todo" });
  }
};

export const getCompletedTodos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = 30;
    const skip = page * limit;

    const completedTodosDocs = await Todo.find({
      user: req.user._id,
      completed: true,
    })
      .populate({
        path: "user",
        select: "username",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({ path: "todoList", select: "name color icon" })
      .skip(skip)
      .limit(limit)
      .sort({ completedAt: -1 })
      .lean();

    const completedTodos = completedTodosDocs.map((todo) => ({
      ...todo,
      listMeta: todo.todoList || todo.completedFromList || null,
    }));

    const hasNextPage = skip + completedTodos.length === limit;

    res.status(200).json({ completedTodos, hasNextPage });
  } catch (error) {
    console.error("Error in getCompletedTodos:", error); // Log the full error
    res.status(500).json({ error: "Failed to fetch completed todos" });
  }
};

export const getPublicCompletedTodos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = 30;
    const skip = page * limit;

    const publicCompletedTodosDocs = await Todo.find({
      isPublic: true,
      completed: true,
    })
      .populate({
        path: "user",
        select: "username fullName",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({ path: "todoList", select: "name icon color" })
      .sort({ completedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // so we can mutate results

    const publicCompletedTodos = publicCompletedTodosDocs.map((todo) => ({
      ...todo,
      listMeta: todo.todoList || todo.completedFromList || null,
    }));

    const totalCount = await Todo.countDocuments({ isPublic: true, completed: true });
    const hasNextPage = skip + publicCompletedTodos.length < totalCount;

    res.status(200).json({
      publicCompletedTodos,
      hasNextPage,
      totalCount: totalCount,
    });
  } catch (error) {
    console.error("Error in getPublicCompletedTodos:", error);
    res.status(500).json({ error: "Failed to fetch public completed todos" });
  }
};

export const getMyActivities = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = 30;
    const skip = page * limit;

    const activitiesDocs = await TodoActivity.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "user",
        select: "username",
        populate: { path: "profileImg", model: "Image", select: "imageUrl" },
      })
      .populate({ path: "todoList", select: "name icon color" })
      .lean();

    const activities = activitiesDocs.map((act) => ({
      ...act,
      listMeta: act.todoList || act.listSnapshot || null,
    }));

    const hasNextPage = activities.length === limit;

    res.status(200).json({ activities, hasNextPage });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch activities" });
  }
};
