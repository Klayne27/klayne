import mongoose from "mongoose";

const weeklyWinnerSchema = new mongoose.Schema(
  {
    weekStart: {
      type: String, // ISO date string of the Monday, e.g. "2025-03-24"
      required: true,
      unique: true,
    },
    winners: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        rank: { type: Number, required: true },
        studyDuration: { type: Number, required: true, default: 0 },
      },
    ],
  },
  { timestamps: true },
);

const WeeklyWinners = mongoose.model("WeeklyWinners", weeklyWinnerSchema);
export default WeeklyWinners;
