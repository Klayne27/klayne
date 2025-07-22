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
      isEdited: {
        type: Boolean,
        default: false,
      },
      // IMPORTANT: Add the message ID so you can easily reference the actual message
      // This is crucial for consistency and potential future features
      messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null,
      },
    },
    // deletedFor: [
    //   {
    //     user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    //     deletedAt: { type: Date, default: Date.now },
    //   },
    // ],
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1, updatedAt: -1 });
conversationSchema.index({ "lastMessage.sender": 1, "lastMessage.seen": 1 });
// conversationSchema.index({ "deletedFor.user": 1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
