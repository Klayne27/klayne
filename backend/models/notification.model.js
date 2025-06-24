// src/models/notification.model.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      // Added 'commentLike' and 'commentReply' types for notifications
      enum: ["follow", "like", "comment", "repost", "commentLike", "commentReply"],
    },
    read: {
      type: Boolean,
      default: false,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: function () {
        // 'postId' is required for notifications related to posts or comments/replies on posts
        return ["comment", "repost", "like", "commentLike", "commentReply"].includes(
          this.type
        );
      },
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment", // REFERENCING THE NEW SEPARATE Comment MODEL
      required: function () {
        // 'commentId' is required for notifications directly related to comments or replies
        return ["comment", "commentLike", "commentReply"].includes(this.type);
      },
    },
    // Adding optional parentCommentId for notifications about replies,
    // useful for context if the reply is on a sub-comment.
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      required: function () {
        return this.type === "commentReply" && this.commentId !== null; // Required only if it's a reply and a commentId exists
      },
    },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
