import mongoose from "mongoose";

const TodoActivitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "created_todo",
        "completed_todo",
        "deleted_todo",
        "updated_todo",
        "created_list",
        "updated_list",
        "deleted_list",
      ],
    },
    todoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Todo",
    },
    todoTitle: {
      type: String,
    },
    todoPriority: {
      type: String,
    },
    listId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TodoList",
    },
    todoList: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TodoList",
      default: null,
    },
    listSnapshot: {
      name: String,
      color: String,
      icon: String,
    },
  },
  { timestamps: true }
);

const TodoActivity = mongoose.model("TodoActivity", TodoActivitySchema);
export default TodoActivity;
