// src/models/comment.model.js
import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    // The user who created this comment
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // The post this comment belongs to
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    // The text content of the comment
    text: {
      type: String,
      required: true,
    },
    // For replies: if this comment is a reply, this field stores the ID of the parent comment
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null, // Null for top-level comments
    },
    // Users who liked this comment
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Count of direct replies to this comment (optional, for quick display)
    repliesCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Add an index for efficient fetching of comments by post and parentComment
commentSchema.index({ post: 1, parentComment: 1, createdAt: -1 });

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
