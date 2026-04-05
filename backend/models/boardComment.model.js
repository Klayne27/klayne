import mongoose from "mongoose";

const boardCommentSchema = new mongoose.Schema(
  {
    boardPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BoardPost",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      trim: true,
    },
    image: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Image",
      default: null,
    },
    img: { type: String, default: null },
    // Flat reply — stores which comment this is replying to
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BoardComment",
      default: null,
    },
    isEdited: { type: Boolean, default: false },
    isDeletedByUser: { type: Boolean, default: false },
    isDeletedByAdmin: { type: Boolean, default: false },
    // Same format as Message.reactions so useMessagingMetaData works directly
    reactions: [
      {
        emoji: { type: String, required: true },
        userId: {
          // Keep the name userId as requested
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        _id: false,
      },
    ],
  },
  { timestamps: true },
);

boardCommentSchema.index({ boardPost: 1, createdAt: 1 });
boardCommentSchema.index({ parentComment: 1 });

const BoardComment = mongoose.model("BoardComment", boardCommentSchema);
export default BoardComment;
