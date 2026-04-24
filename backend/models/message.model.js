import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: String,

    // ── Read tracking ─────────────────────────────────────────────────────────
    // `seen` (boolean) is kept for DM backward-compat and quick DM tick checks.
    // `seenBy` (array) is the authoritative per-user read list used by groups
    // (and optionally DMs — the DM path populates both for consistency).
    seen: { type: Boolean, default: false },
    seenBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    // ─────────────────────────────────────────────────────────────────────────

    img: { type: String, default: "" },
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
    voiceMessageDuration: { type: Number, default: null },
    isEdited: { type: Boolean, default: false },
    isDeletedByUser: { type: Boolean, default: false },
    isDeletedByAdmin: { type: Boolean, default: false },
    deletedByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reactions: [
      {
        emoji: { type: String, required: true },
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
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, sender: 1, seen: 1 });
messageSchema.index({ conversationId: 1, seenBy: 1 }); // for group unread counts

const Message = mongoose.model("Message", messageSchema);
export default Message;
