import mongoose from "mongoose";

const devlogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
    },
    tag: {
      type: String,
      enum: ["update", "bugfix", "feature", "announcement", "hotfix", ""],
      default: "",
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

const Devlog = mongoose.model("Devlog", devlogSchema);

export default Devlog;
