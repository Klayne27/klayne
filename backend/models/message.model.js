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
    reactions: [
      {
        emoji: {
          type: String,
          enum: ["❤️", "👍", "😂", "😭", "😡"], 
          required: true,
        },
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

// --- ADD INDEXES HERE ---

// Index for fetching messages within a conversation, sorted by creation time
// This is critical for `getMessagesByConversationId` and efficient pagination
messageSchema.index({ conversationId: 1, createdAt: -1 });

// Index for efficiently updating seen status for messages in a conversation
messageSchema.index({ conversationId: 1, sender: 1, seen: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
