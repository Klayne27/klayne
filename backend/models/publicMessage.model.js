import mongoose from "mongoose";

const publicChatMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    img: {
      type: String,
      default: "",
    },
    // Add a field to mark messages as deleted by an admin
    isDeletedByAdmin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const PublicChatMessage = mongoose.model("PublicChatMessage", publicChatMessageSchema);

export default PublicChatMessage;
