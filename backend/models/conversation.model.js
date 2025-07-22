import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    hiddenFor: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    lastMessage: {
      text: String,
      img: {
        type: String,
        default: "",
      },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      seen: {
        type: Boolean,
        default: false,
      },
      isEdited: {
        type: Boolean,
        default: false,
      },
      messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null,
      },
    },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1, updatedAt: -1 });
conversationSchema.index({ "lastMessage.sender": 1, "lastMessage.seen": 1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
