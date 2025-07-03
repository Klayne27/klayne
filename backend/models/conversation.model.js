import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
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
    },
    deletedFor: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        deletedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// --- ADD INDEXES HERE ---

// Index for finding conversations involving a specific user, sorted by last update
// Useful for `getConversations` and general conversation list display
conversationSchema.index({ participants: 1, updatedAt: -1 });

// Index for efficiently finding conversations with unread last messages from others
conversationSchema.index({ "lastMessage.sender": 1, "lastMessage.seen": 1 });

// Index for filtering conversations that haven't been "deleted for" a specific user
conversationSchema.index({ "deletedFor.user": 1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
