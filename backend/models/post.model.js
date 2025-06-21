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
    comments: [
      {
        text: {
          type: String,
          required: true,
        },
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
          immutable: true,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // --- NEW FIELDS FOR REPOST ---
    repostedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null, // Null for original posts
    },
    repostsCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Add a virtual to count reposts for an original post (optional, but good for querying)
// postSchema.virtual("reposts", {
//   ref: "Post",
//   localField: "_id",
//   foreignField: "repostedFrom",
//   count: true,
// });

// Ensure virtuals are included when converting to JSON
postSchema.set("toJSON", { virtuals: false });
postSchema.set("toObject", { virtuals: false });

const Post = mongoose.model("Post", postSchema);

export default Post;
