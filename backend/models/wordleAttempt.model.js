import mongoose from "mongoose";

const wordleGuessSchema = new mongoose.Schema(
  {
    word: {
      type: String,
      required: true,
      lowercase: true,
      minlength: 5,
      maxlength: 5,
    },
    result: {
      type: [String],
      required: true,
      validate: {
        validator: (value) =>
          Array.isArray(value) &&
          value.length === 5 &&
          value.every((item) => ["correct", "present", "absent"].includes(item)),
        message: "Result must contain five Wordle tile states",
      },
    },
  },
  { _id: false, timestamps: true },
);

const wordleAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    puzzle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WordlePuzzle",
      required: true,
    },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"],
    },
    guesses: {
      type: [wordleGuessSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["in_progress", "won", "lost"],
      default: "in_progress",
    },
    score: {
      type: Number,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

wordleAttemptSchema.index({ user: 1, puzzle: 1 }, { unique: true });
wordleAttemptSchema.index({ date: 1, status: 1, score: 1, completedAt: 1 });
wordleAttemptSchema.index({ user: 1, status: 1 });

const WordleAttempt = mongoose.model("WordleAttempt", wordleAttemptSchema);

export default WordleAttempt;
