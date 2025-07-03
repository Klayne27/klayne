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
    video: {
      // NEW FIELD FOR VIDEO URL
      type: String,
    },
    mediaType: {
      // NEW FIELD to easily distinguish (optional but recommended)
      type: String,
      enum: ["image", "video", "none"], // 'none' if only text
      default: "none",
    },
    imgPublicId: {
      // To store public_id for image
      type: String,
    },
    videoPublicId: {
      // To store public_id for video
      type: String,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
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
