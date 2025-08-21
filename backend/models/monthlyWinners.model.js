// models/monthlyWinners.model.js
import mongoose from "mongoose";

const monthlyWinnerSchema = new mongoose.Schema(
  {
    month: {
      type: String,
      required: true,
      unique: true,
    },
    winners: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        rank: {
          type: Number,
          required: true,
        },
        studyDuration: {
          type: Number,
          required: true,
          default: 0,
        },
      },
    ],
  },
  { timestamps: true }
);

const MonthlyWinners = mongoose.model("MonthlyWinners", monthlyWinnerSchema);
export default MonthlyWinners;
