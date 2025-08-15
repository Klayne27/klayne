// models/LevelUp.js
import mongoose from "mongoose";

const levelUpSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    newLevel: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

const LevelUp = mongoose.model("LevelUp", levelUpSchema);

export default LevelUp;
