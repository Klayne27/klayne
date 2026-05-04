import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    // ── DM-only ──────────────────────────────────────────────────────────────
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // ── Shared ───────────────────────────────────────────────────────────────
    isGroup: { type: Boolean, default: false },
    hiddenFor: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    lastMessage: {
      text: String,
      img: { type: String, default: "" },
      audio: { type: String, default: "" },
      deletedFor: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        default: [],
      },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

      // `seen` stays for DM tick-indicator backward compat.
      seen: { type: Boolean, default: false },

      // `seenBy` is the authoritative per-user list for groups (and DMs going forward).
      seenBy: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        default: [],
      },

      isEdited: { type: Boolean, default: false },
      messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: null,
      },
    },
    pinnedMessages: [
      {
        message: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Message",
          required: true,
        },
        pinnedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        pinnedAt: { type: Date, default: Date.now },
      },
    ],

    // ── Group-only ────────────────────────────────────────────────────────────
    name: { type: String, trim: true },
    avatar: { type: mongoose.Schema.Types.ObjectId, ref: "Image", default: null },
    description: { type: String, default: "" },
    isPrivate: { type: Boolean, default: false },
    inviteCode: { type: String, unique: true, sparse: true },

    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        role: {
          type: String,
          enum: ["owner", "admin", "member"],
          default: "member",
        },
        nickname: {
          type: String,
          default: "",
          trim: true,
          maxlength: 50,
        },
        joinedAt: { type: Date, default: Date.now },
      },
    ],

    joinRequests: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        requestedAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
      },
    ],
  },
  { timestamps: true },
);

conversationSchema.index({ participants: 1, updatedAt: -1 });
conversationSchema.index({ "lastMessage.sender": 1, "lastMessage.seen": 1 });
conversationSchema.index({ "members.user": 1 });
conversationSchema.index({ inviteCode: 1 });

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
