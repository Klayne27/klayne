import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: String,
    seen: {
      type: Boolean,
      default: false,
    },
    img: {
      type: String,
      default: "",
    },
    repliedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    image: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Image",
      default: null,
    },
    voiceMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Image",
      default: null,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeletedByUser: {
      type: Boolean,
      default: false,
    },
    reactions: [
      {
        emoji: {
          type: String,
          required: true,
        },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        _id: false,
      },
    ],
    deletedFor: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, sender: 1, seen: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
