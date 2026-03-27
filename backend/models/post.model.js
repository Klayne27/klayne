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
    image: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Image",
      default: null,
    },
    video: {
      type: String,
    },
    mediaType: {
      type: String,
      enum: ["image", "video", "none"],
      default: "none",
    },
    imgPublicId: {
      type: String,
    },
    videoPublicId: {
      type: String,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    parentPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
      index: true, // important for query performance
    },
    repliesCount: { type: Number, default: 0 },
    repostedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },
    repostsCount: {
      type: Number,
      default: 0,
    },
    repostedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    bookmarkedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
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

    pollOptions: [
      {
        text: {
          type: String,
          required: true,
          trim: true,
        },
        voters: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: [],
          },
        ],
      },
    ],

    pollTotalVotes: {
      type: Number,
      default: 0,
    },
    // NEW FIELD FOR MENTIONS
    mentionedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isScheduled: {
      type: Boolean,
      default: false,
    },
    scheduledAt: {
      type: Date,
      default: null, // Will be set only if isScheduled is true
    },
    publishedAt: {
      type: Date,
      default: null, // Initially null for all posts
    },
    isVent: {
      type: Boolean,
      default: false,
      index: true, // Add an index for faster querying of vent posts
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    isIC: {
      type: Boolean,
      default: false,
      index: true,
    },
    editHistory: [
      {
        text: String,
        editedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true },
);

const Post = mongoose.model("Post", postSchema);

export default Post;

