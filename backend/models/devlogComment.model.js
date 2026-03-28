import mongoose from "mongoose";

const devlogCommentSchema = new mongoose.Schema(
  {
    devlog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Devlog",
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    dislikes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
  },
  { timestamps: true },
);

const DevlogComment = mongoose.model("DevlogComment", devlogCommentSchema);

export default DevlogComment;
