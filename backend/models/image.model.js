import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  parentDocument: {
    type: mongoose.Schema.Types.ObjectId,
    // required: true,
    index: true,
  },
  parentModel: {
    type: String,
    enum: ["Post", "Comment", "Message", "PublicChatMessage", "User"],
    required: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

const Image = mongoose.model("Image", imageSchema);
export default Image;
