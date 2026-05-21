import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import WordlePuzzle from "../../models/wordlePuzzle.model.js";

const WORDLE_EPOCH = new Date("2021-06-19T00:00:00.000Z");
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORDLE_DATA_DIR = path.resolve(__dirname, "../../data/wordle");

const readWordCsv = (filename) => {
  const filePath = path.join(WORDLE_DATA_DIR, filename);
  const contents = fs.readFileSync(filePath, "utf8");

  return contents
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^"|"$/g, "").toLowerCase())
    .filter((word, index) => index > 0 && /^[a-z]{5}$/.test(word));
};

export const WORDLE_MAX_GUESSES = 6;
export const WORDLE_SOLUTIONS = readWordCsv("valid_solutions.csv");
export const WORDLE_VALID_GUESSES = readWordCsv("valid_guesses.csv");
export const WORDLE_WORD_SET = new Set([...WORDLE_SOLUTIONS, ...WORDLE_VALID_GUESSES]);

export const getWordleDateKey = (date = new Date()) => date.toISOString().slice(0, 10);

export const shiftWordleDateKey = (dateKey, dayDelta) => {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + dayDelta);
  return getWordleDateKey(date);
};

export const getWordlePuzzleNumber = (dateKey = getWordleDateKey()) => {
  const today = new Date(`${dateKey}T00:00:00.000Z`);
  return Math.floor((today.getTime() - WORDLE_EPOCH.getTime()) / MS_PER_DAY) + 1;
};

export const getWordleRank = (averageScore) => {
  if (averageScore <= 3) return "Diamond";
  if (averageScore <= 3.5) return "Platinum";
  if (averageScore <= 4) return "Gold";
  if (averageScore <= 4.5) return "Silver";
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

const SHUFFLE_SEED = 20250521;

const seededShuffle = (arr, seed) => {
  const shuffled = [...arr];
  let s = seed >>> 0; // coerce to uint32

  for (let i = shuffled.length - 1; i > 0; i--) {
    // LCG step (Numerical Recipes constants)
    s = Math.imul(s, 1664525) + 1013904223;
    const j = (s >>> 0) % (i + 1); // unsigned right shift keeps it positive
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
};

// Shuffled once at startup. Index = puzzleNumber - 1.
const SHUFFLED_SOLUTIONS = seededShuffle(WORDLE_SOLUTIONS, SHUFFLE_SEED);

export const getOrCreateWordlePuzzle = async (date = new Date()) => {
  const dateKey = getWordleDateKey(date);
  const puzzleNumber = getWordlePuzzleNumber(dateKey);

  // Use shuffled order instead of CSV order
  const answer = SHUFFLED_SOLUTIONS[(puzzleNumber - 1) % SHUFFLED_SOLUTIONS.length];

  return WordlePuzzle.findOneAndUpdate(
    { date: dateKey },
    { $setOnInsert: { date: dateKey, puzzleNumber, answer } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
};

export const WORDLE_BADGES = [
  {
    id: "wordle-first-try",
    label: "Ace",
    description: "Solve a Wordle on the first guess",
  },
  {
    id: "wordle-sixth-sense",
    label: "Sixth Sense",
    description: "Solve a Wordle on the sixth guess",
  },
  {
    id: "wordle-clean-solve",
    label: "Clean Solve",
    description: "Solve using only green and gray tiles",
  },
  {
    id: "wordle-3-streak",
    label: "Spark Streak",
    description: "Build a 3-day Wordle win streak",
  },
  {
    id: "wordle-7-streak",
    label: "Week Sharp",
    description: "Build a 7-day Wordle win streak",
  },
  {
    id: "wordle-14-streak",
    label: "Fortnight Focus",
    description: "Build a 14-day Wordle win streak",
  },
  {
    id: "wordle-10-solves",
    label: "Ten Solves",
    description: "Solve 10 total Wordles",
  },
  {
    id: "wordle-25-solves",
    label: "Quarter Century",
    description: "Solve 25 total Wordles",
  },
  {
    id: "wordle-50-solves",
    label: "Grid Veteran",
    description: "Solve 50 total Wordles",
  },
  {
    id: "wordle-100-solves",
    label: "Wordle Centurion",
    description: "Solve 100 total Wordles",
  },
];

export const getWordleBadgeMeta = (badgeId) =>
  WORDLE_BADGES.find((badge) => badge.id === badgeId) || null;

export const getWordleStats = async (userId, WordleAttemptModel) => {
  // 1. Fetch ALL completed attempts sorted chronologically by date
  const completedAttempts = await WordleAttemptModel.find({
    user: userId,
    status: { $in: ["won", "lost"] },
  })
    .select("date status score")
    .sort({ date: 1 }) // Crucial: Keeps dates linear
    .lean();

  const gamesPlayed = completedAttempts.length;
  const wins = completedAttempts.filter((attempt) => attempt.status === "won").length;
  const losses = gamesPlayed - wins;
  const winPercentage = gamesPlayed === 0 ? 0 : Math.round((wins / gamesPlayed) * 100);

  // 2. Calculate Max Streak safely by walking through EVERY game played
  let maxStreak = 0;
  let runningStreak = 0;
  let previousDate = null;

  for (const attempt of completedAttempts) {
    if (attempt.status === "lost") {
      runningStreak = 0; // A loss kills the streak instantly
      previousDate = attempt.date;
      continue;
    }

    // It's a win! Check if it continues the chain
    if (!previousDate || shiftWordleDateKey(previousDate, 1) === attempt.date) {
      runningStreak += 1;
    } else if (previousDate === attempt.date) {
      // Edge case: Safety check if duplicate dates somehow exist in DB
      // Do not increment, do not break the streak
    } else {
      runningStreak = 1; // Gap detected, reset chain
    }

    maxStreak = Math.max(maxStreak, runningStreak);
    previousDate = attempt.date;
  }

  // 3. Create a quick lookup Set for current streak checks
  const winDates = new Set(
    completedAttempts
      .filter((attempt) => attempt.status === "won")
      .map((attempt) => attempt.date),
  );

  const today = getWordleDateKey(); // Note: Ideally pass this from req.headers['user-timezone']
  const todayAttempt = completedAttempts.find((a) => a.date === today);
  const lostToday = todayAttempt?.status === "lost";

  let currentStreak = 0;

  if (!lostToday) {
    // Your beautiful logic preserved:
    // If won today -> start today. If not played yet -> check if they won yesterday.
    const startDate = winDates.has(today) ? today : shiftWordleDateKey(today, -1);
    let cursor = startDate;

    while (winDates.has(cursor)) {
      currentStreak += 1;
      cursor = shiftWordleDateKey(cursor, -1);
    }
  }

  // 4. Distribution map stays the same
  const guessDistribution = [1, 2, 3, 4, 5, 6].map((guessCount) => ({
    guessCount,
    count: completedAttempts.filter(
      (attempt) => attempt.status === "won" && attempt.score === guessCount,
    ).length,
  }));

  return {
    gamesPlayed,
    wins,
    losses,
    winPercentage,
    currentStreak,
    maxStreak,
    guessDistribution,
  };
};

export const unlockWordleBadges = async ({ user, attempt, stats }) => {
  if (!user || !attempt || attempt.status !== "won") return [];

  const existingBadges = new Set(user.badges || []);
  const badgesToUnlock = [];

  const addBadge = (badgeId) => {
    if (!existingBadges.has(badgeId)) {
      existingBadges.add(badgeId);
      badgesToUnlock.push(badgeId);
    }
  };

  if (attempt.score === 1) addBadge("wordle-first-try");
  if (attempt.score === 6) addBadge("wordle-sixth-sense");

  const usedOnlyGreenAndGray = attempt.guesses.every((guess) =>
    guess.result.every((tile) => tile === "correct" || tile === "absent"),
  );
  if (usedOnlyGreenAndGray) addBadge("wordle-clean-solve");

  if (stats.currentStreak >= 3) addBadge("wordle-3-streak");
  if (stats.currentStreak >= 7) addBadge("wordle-7-streak");
  if (stats.currentStreak >= 14) addBadge("wordle-14-streak");

  if (stats.wins >= 10) addBadge("wordle-10-solves");
  if (stats.wins >= 25) addBadge("wordle-25-solves");
  if (stats.wins >= 50) addBadge("wordle-50-solves");
  if (stats.wins >= 100) addBadge("wordle-100-solves");

  if (badgesToUnlock.length > 0) {
    user.badges = [...existingBadges];
    user.markModified("badges");
    await user.save();
  }

  return badgesToUnlock.map((badgeId) => getWordleBadgeMeta(badgeId)).filter(Boolean);
};
