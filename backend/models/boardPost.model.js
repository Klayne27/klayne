import mongoose from "mongoose";

const boardPostSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      trim: true,
    },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    images: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Image",
        default: [],
      },
    ],
    isEdited: { type: Boolean, default: false },
    reactions: [
      {
        emoji: { type: String, required: true },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        _id: false,
      },
    ],
    commentsCount: { type: Number, default: 0 },
    isPinned: { type: Boolean, default: false },
    tags: [{ type: String, trim: true }],
  },

  { timestamps: true },
);

boardPostSchema.index({ createdAt: -1 });
boardPostSchema.index({ user: 1 });

const BoardPost = mongoose.model("BoardPost", boardPostSchema);
export default BoardPost;
