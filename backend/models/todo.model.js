import mongoose from "mongoose";

const todoSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxLength: 100,
    },
    description: {
      type: String,
      maxLength: 500,
      default: "",
    },
    completed: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "low",
    },
    dueDate: {
      type: Date,
      default: null,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    todoList: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TodoList",
      default: null,
    },
    completedFromList: {
      name: { type: String },
      color: { type: String },
      icon: { type: String },
      category: { type: String },
      _id: { type: mongoose.Schema.Types.ObjectId, ref: "TodoList" }, // Reference to the original list's ID
    },
  },
  { timestamps: true }
);

todoSchema.index({ user: 1, completed: 1, createdAt: -1 });
todoSchema.index({ isPublic: 1, createdAt: -1 });
todoSchema.index({ dueDate: 1, completed: 1 });

const Todo = mongoose.model("Todo", todoSchema);

export default Todo;
