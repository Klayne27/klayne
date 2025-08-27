import mongoose from "mongoose";

const studySessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    duration: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },

  },
  { timestamps: true }
);

const StudySession = mongoose.model("StudySession", studySessionSchema);

export default StudySession;
