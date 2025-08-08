import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    text: {
      type: String,
      required: false,
    },
    img: {
      type: String,
      default: null,
    },
    image: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Image",
      default: null,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    repliesCount: {
      type: Number,
      default: 0,
    },
    mentionedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

commentSchema.index({ post: 1, parentComment: 1, createdAt: -1 });

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
