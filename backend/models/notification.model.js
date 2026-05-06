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
      enum: [
        "follow",
        "followRequest", // ← NEW
        "followRequestAccepted", // ← NEW
        "like",
        "repost",
        "mention",
        "reply",
        "replyLike",
        "replyRepost",
        "replyReply",
        "replyMention",
        "boardComment",
        "boardReply",
      ],
    },
    read: {
      type: Boolean,
      default: false,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      // required: function () {
      //   return [
      //     "repost",
      //     "like",
      //     "mention",
      //     "reply",
      //     "replyLike",
      //     "replyRepost",
      //     "replyReply",
      //     "replyMention",
      //   ].includes(this.type);
      // },
    },
    boardPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BoardPost",
      default: null,
    },
    boardCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BoardComment",
      default: null,
    },
    isAnonymousInteraction: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
