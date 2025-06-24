// src/models/post.model.js
import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
    },
    img: {
      type: String,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // REMOVED EMBEDDED COMMENTS ARRAY
    // comments: [
    //   {
    //     text: {
    //       type: String,
    //       required: true,
    //     },
    //     user: {
    //       type: mongoose.Schema.Types.ObjectId,
    //       ref: "User",
    //       required: true,
    //     },
    //     createdAt: {
    //       type: Date,
    //       default: Date.now,
    //       immutable: true,
    //     },
    //     updatedAt: {
    //       type: Date,
    //       default: Date.now,
    //     },
    //     likes: [
    //       {
    //         type: mongoose.Schema.Types.ObjectId,
    //         ref: "User",
    //       },
    //     ],
    //   },
    // ],
    // ADDED commentsCount for quick display without fetching all comments
    commentsCount: {
      type: Number,
      default: 0,
    },
    repostedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },
    repostsCount: {
      type: Number,
      default: 0,
    },
    // Assuming 'deletedFor' is a field you use for soft deletes or audience control
    // If it's not needed, you can remove it. Keeping it as it was in your original Post model.
    deletedFor: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        deletedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

const Post = mongoose.model("Post", postSchema);

export default Post;
