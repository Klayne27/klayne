import mongoose from "mongoose";

const hashtagSchema = new mongoose.Schema(
  {
    tag: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    count: { type: Number, default: 0, index: true },
    lastUsed: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

// Compound index for trending query: high count + recent use
hashtagSchema.index({ count: -1, lastUsed: -1 });

const Hashtag = mongoose.model("Hashtag", hashtagSchema);
export default Hashtag;
