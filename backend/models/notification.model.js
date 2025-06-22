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
      enum: ["follow", "like", "comment", "repost"],
    },
    read: {
      type: Boolean,
      default: false,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: function () {
        return ["comment", "repost", "like"].includes(this.type);
      },
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      // REMOVE `ref: "Comment"` because there is no separate Comment model.
      // This field will simply store the ObjectId of the comment subdocument.
      required: function () {
        return ["comment", "commentLike"].includes(this.type); // Keep this for data integrity
      },
    },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
