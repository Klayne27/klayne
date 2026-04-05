import mongoose from "mongoose";

const boardCommentSchema = new mongoose.Schema(
  {
    boardPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BoardPost",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Image",
      default: null,
    },
    img: { type: String, default: null },
    reactions: [
      {
        emoji: { type: String, required: true },
        users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      },
    ],
  },
  { timestamps: true },
);

boardCommentSchema.index({ boardPost: 1, createdAt: 1 });

const BoardComment = mongoose.model("BoardComment", boardCommentSchema);
export default BoardComment;
