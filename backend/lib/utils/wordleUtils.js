import WORDLE_WORDS from "../../../frontend/src/constants/wordleWords.js";
import WordlePuzzle from "../../models/wordlePuzzle.model.js";

const WORDLE_EPOCH = new Date("2021-06-19T00:00:00.000Z");
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const WORDLE_MAX_GUESSES = 6;
export const WORDLE_WORD_SET = new Set(WORDLE_WORDS);

export const getWordleDateKey = (date = new Date()) => date.toISOString().slice(0, 10);

export const getWordlePuzzleNumber = (dateKey = getWordleDateKey()) => {
  const today = new Date(`${dateKey}T00:00:00.000Z`);
  return Math.floor((today.getTime() - WORDLE_EPOCH.getTime()) / MS_PER_DAY) + 1;
};

export const getWordleRank = (averageScore) => {
  if (averageScore < 3) return "Diamond";
  if (averageScore < 3.5) return "Platinum";
  if (averageScore < 4) return "Gold";
  if (averageScore < 4.5) return "Silver";
  return "Bronze";
};

export const sanitizeWordleAttempt = (attempt) => {
  if (!attempt) {
    return {
      guesses: [],
      status: "in_progress",
      score: null,
      completedAt: null,
    };
  }

  const plainAttempt = attempt.toObject ? attempt.toObject() : attempt;

  return {
    _id: plainAttempt._id,
    date: plainAttempt.date,
    guesses: plainAttempt.guesses || [],
    status: plainAttempt.status,
    score: plainAttempt.score,
    completedAt: plainAttempt.completedAt,
  };
};

export const evaluateWordleGuess = (guess, answer) => {
  const result = Array(5).fill("absent");
  const remainingLetters = {};

  for (let i = 0; i < answer.length; i += 1) {
    if (guess[i] === answer[i]) {
      result[i] = "correct";
    } else {
      remainingLetters[answer[i]] = (remainingLetters[answer[i]] || 0) + 1;
    }
  }

  for (let i = 0; i < guess.length; i += 1) {
    if (result[i] === "correct") continue;

    const letter = guess[i];
    if (remainingLetters[letter] > 0) {
      result[i] = "present";
      remainingLetters[letter] -= 1;
    }
  }

  return result;
};

export const getOrCreateWordlePuzzle = async (date = new Date()) => {
  const dateKey = getWordleDateKey(date);
  const puzzleNumber = getWordlePuzzleNumber(dateKey);
  const answer = WORDLE_WORDS[(puzzleNumber - 1) % WORDLE_WORDS.length];

  return WordlePuzzle.findOneAndUpdate(
    { date: dateKey },
    {
      $setOnInsert: {
        date: dateKey,
        puzzleNumber,
        answer,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );
};
