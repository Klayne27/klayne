import mongoose from "mongoose";

const wordlePuzzleSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      unique: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"],
    },
    puzzleNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    answer: {
      type: String,
      required: true,
      lowercase: true,
      minlength: 5,
      maxlength: 5,
      select: false,
    },
  },
  { timestamps: true },
);

const WordlePuzzle = mongoose.model("WordlePuzzle", wordlePuzzleSchema);

export default WordlePuzzle;
