// models/suggestion.model.js
import mongoose from "mongoose";

const suggestionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["feature", "bug", "idea", "other"],
      default: "idea",
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxLength: 1000,
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "planned", "done", "rejected"],
      default: "pending",
    },
    adminNote: {
      type: String,
      default: "",
      maxLength: 500,
    },
  },
  { timestamps: true },
);

const Suggestion = mongoose.model("Suggestion", suggestionSchema);
export default Suggestion;
