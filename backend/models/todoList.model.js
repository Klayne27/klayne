import mongoose from "mongoose";

const todoListSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxLength: 50,
    },
    description: {
      type: String,
      maxLength: 200,
      default: "",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      enum: [
        "red",
        "orange",
        "yellow",
        "emerald",
        "teal",
        "cyan",
        "blue",
        "violet",
        "fuchsia",
        "pink",
        "slate",
        "stone",
      ],
      default: "blue",
    },
    icon: {
      type: String,
      default: "FaPen",
    },
    totalTodos: {
      type: Number,
      default: 0,
    },
    completedTodos: {
      type: Number,
      default: 0,
    },
    settings: {
      autoArchiveCompleted: {
        type: Boolean,
        default: false,
      },
    },
    todos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Todo",
      },
    ],
  },
  {
    timestamps: true,
    // IMPORTANT: Add these options to ensure virtuals are included in the output
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Define the virtual field
// todoListSchema.virtual("todos", {
//   ref: "Todo", // The model to use for population
//   localField: "_id", // Find 'Todo' documents where...
//   foreignField: "todoList", // ...the 'todoList' field matches this document's '_id'
// });

todoListSchema.index({ owner: 1, createdAt: -1 });
todoListSchema.index({ isPublic: 1, createdAt: -1 });

const TodoList = mongoose.model("TodoList", todoListSchema);

export default TodoList;
