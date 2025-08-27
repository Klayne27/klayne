import mongoose from "mongoose";

const studyTaskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    totalDuration: {
      type: Number, // Stored in seconds
      default: 0,
    },
  },
  { timestamps: true }
);

const StudyTask = mongoose.model("StudyTask", studyTaskSchema);
export default StudyTask;
