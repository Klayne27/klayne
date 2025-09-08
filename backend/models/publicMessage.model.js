import mongoose from "mongoose";

const publicChatMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      default: "",
    },
    img: {
      type: String,
      default: "",
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
    // Add a field to mark messages as deleted by an admin
    isDeletedByAdmin: {
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
          // enum: ["❤️", "👍", "😂", "😭", "😡"], // Only allowed emojis
          required: true,
        },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },

        _id: false, // Prevents Mongoose from creating _id for subdocuments if not needed
      },
    ],
    repliedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PublicChatMessage", // References another public chat message
      default: null, // If null, it's not a reply
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const PublicChatMessage = mongoose.model("PublicChatMessage", publicChatMessageSchema);

export default PublicChatMessage;
