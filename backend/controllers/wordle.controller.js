import User from "../models/user.model.js";
import WordleAttempt from "../models/wordleAttempt.model.js";
import WordlePuzzle from "../models/wordlePuzzle.model.js";
import {
  WORDLE_MAX_GUESSES,
  WORDLE_WORD_SET,
  evaluateWordleGuess,
  getOrCreateWordlePuzzle,
  getWordleBadgeMeta,
  getWordleDateKey,
  getWordleRank,
  getWordleStats,
  sanitizeWordleAttempt,
  unlockWordleBadges,
} from "../lib/utils/wordleUtils.js";

const USER_SELECT = "username fullName profileImg nameColor equipped preferredBadge";
const ALL_TIME_MIN_GAMES = 5; // qualification threshold


const serializeDailyEntry = (attempt, rank) => ({
  rank,
  user: attempt.user,
  guesses: attempt.guesses,
  status: attempt.status,
  score: attempt.score,
  completedAt: attempt.completedAt,
});

export const getTodayWordle = async (req, res) => {
  try {
    const puzzle = await getOrCreateWordlePuzzle();
    const attempt = await WordleAttempt.findOne({
      user: req.user._id,
      puzzle: puzzle._id,
    });
    const solvedAnswer =
      attempt?.status !== "in_progress"
        ? (await WordlePuzzle.findById(puzzle._id).select("+answer"))?.answer
        : undefined;

    res.status(200).json({
      date: puzzle.date,
      puzzleNumber: puzzle.puzzleNumber,
      maxGuesses: WORDLE_MAX_GUESSES,
      attempt: sanitizeWordleAttempt(attempt),
      answer: solvedAnswer,
    });
  } catch (error) {
    console.error("Error in getTodayWordle:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const submitWordleGuess = async (req, res) => {
  try {
    const guess = String(req.body.guess || "").toLowerCase().trim();

    if (!/^[a-z]{5}$/.test(guess)) {
      return res.status(400).json({ error: "Guess must be a five-letter word" });
    }

    if (!WORDLE_WORD_SET.has(guess)) {
      return res.status(400).json({ error: "Not in word list" });
    }

    const puzzle = await getOrCreateWordlePuzzle();
    const puzzleWithAnswer = await WordlePuzzle.findById(puzzle._id).select("+answer");

    let attempt = await WordleAttempt.findOne({
      user: req.user._id,
      puzzle: puzzle._id,
    });

    if (!attempt) {
      attempt = await WordleAttempt.create({
        user: req.user._id,
        puzzle: puzzle._id,
        date: puzzle.date,
      });
    }

    if (attempt.status !== "in_progress") {
      return res.status(409).json({
        error: "You already finished today's Wordle",
        attempt: sanitizeWordleAttempt(attempt),
        answer: puzzleWithAnswer.answer,
      });
    }

    if (attempt.guesses.length >= WORDLE_MAX_GUESSES) {
      return res.status(409).json({ error: "No guesses remaining" });
    }

    const result = evaluateWordleGuess(guess, puzzleWithAnswer.answer);
    attempt.guesses.push({ word: guess, result });

    const hasWon = guess === puzzleWithAnswer.answer;
    const hasLost = !hasWon && attempt.guesses.length >= WORDLE_MAX_GUESSES;

    if (hasWon || hasLost) {
      attempt.status = hasWon ? "won" : "lost";
      attempt.score = hasWon ? attempt.guesses.length : WORDLE_MAX_GUESSES + 1;
      attempt.completedAt = new Date();
    }

    await attempt.save();

    const stats = attempt.status !== "in_progress" ? await getWordleStats(req.user._id, WordleAttempt) : null;
    const unlockedBadges =
      attempt.status === "won"
        ? await unlockWordleBadges({ user: req.user, attempt, stats })
        : [];

    res.status(200).json({
      date: puzzle.date,
      puzzleNumber: puzzle.puzzleNumber,
      maxGuesses: WORDLE_MAX_GUESSES,
      attempt: sanitizeWordleAttempt(attempt),
      answer: attempt.status !== "in_progress" ? puzzleWithAnswer.answer : undefined,
      stats,
      unlockedBadges,
    });
  } catch (error) {
    console.error("Error in submitWordleGuess:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getWordleUserStats = async (req, res) => {
  try {
    const stats = await getWordleStats(req.user._id, WordleAttempt);
    const earnedWordleBadges = (req.user.badges || [])
      .map((badgeId) => getWordleBadgeMeta(badgeId))
      .filter(Boolean);

    res.status(200).json({
      ...stats,
      earnedBadges: earnedWordleBadges,
    });
  } catch (error) {
    console.error("Error in getWordleUserStats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getWordleDailyLeaderboard = async (req, res) => {
  try {
    const date = req.query.date || getWordleDateKey();
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skipIndex = (page - 1) * limit;

    const filter = {
      date,
      status: { $in: ["won", "lost"] },
    };

    const totalCount = await WordleAttempt.countDocuments(filter);
    const attempts = await WordleAttempt.find(filter)
      .sort({ score: 1, completedAt: 1, createdAt: 1 })
      .skip(skipIndex)
      .limit(limit)
      .populate({
        path: "user",
        select: USER_SELECT,
        populate: { path: "profileImg", select: "imageUrl" },
      });

    res.status(200).json({
      leaderboard: attempts.map((attempt, index) =>
        serializeDailyEntry(attempt, skipIndex + index + 1),
      ),
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      date,
    });
  } catch (error) {
    console.error("Error in getWordleDailyLeaderboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getWordleAllTimeLeaderboard = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skipIndex = (page - 1) * limit;

    const rows = await WordleAttempt.aggregate([
      { $match: { status: { $in: ["won", "lost"] }, score: { $ne: null } } },
      {
        $group: {
          _id: "$user",
          gamesPlayed: { $sum: 1 },
          wins: { $sum: { $cond: [{ $eq: ["$status", "won"] }, 1, 0] } },
          totalScore: { $sum: "$score" },
          bestScore: { $min: "$score" },
        },
      },
      // ── Only include players who have completed at least 5 different days ──
      { $match: { gamesPlayed: { $gte: ALL_TIME_MIN_GAMES } } },
      {
        $addFields: {
          averageScore: { $divide: ["$totalScore", "$gamesPlayed"] },
          winRate: { $divide: ["$wins", "$gamesPlayed"] },
        },
      },
      { $sort: { averageScore: 1, wins: -1, gamesPlayed: -1, _id: 1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          leaderboard: [{ $skip: skipIndex }, { $limit: limit }],
        },
      },
    ]);

    const leaderboard = rows[0]?.leaderboard || [];
    const totalCount = rows[0]?.metadata?.[0]?.total || 0;

    const users = await User.find({ _id: { $in: leaderboard.map((row) => row._id) } })
      .select(USER_SELECT)
      .populate({ path: "profileImg", select: "imageUrl" });

    const userMap = new Map(users.map((user) => [String(user._id), user]));

    return res.status(200).json({
      leaderboard: leaderboard.map((row, index) => ({
        rank: skipIndex + index + 1,
        user: userMap.get(String(row._id)),
        gamesPlayed: row.gamesPlayed,
        wins: row.wins,
        losses: row.gamesPlayed - row.wins,
        averageScore: Number(row.averageScore.toFixed(2)),
        bestScore: row.bestScore,
        winRate: Number((row.winRate * 100).toFixed(1)),
        tier: getWordleRank(row.averageScore),
      })),
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      minGamesRequired: ALL_TIME_MIN_GAMES, // send to client so UI stays in sync
    });
  } catch (error) {
    console.error("Error in getWordleAllTimeLeaderboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/wordle/history?page=1&limit=20
export const getWordleHistory = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20); // hard-cap at 50
    const skip  = (page - 1) * limit;
 
    const filter = {
      user:   req.user._id,
      status: { $in: ["won", "lost"] },
    };
 
    const [totalCount, attempts] = await Promise.all([
      WordleAttempt.countDocuments(filter),
      WordleAttempt.find(filter)
        .sort({ date: -1 })          // newest first
        .skip(skip)
        .limit(limit)
        .populate({
          path:   "puzzle",
          // '+answer' overrides the schema-level `select: false`
          select: "+answer puzzleNumber date",
        }),
    ]);
 
    res.status(200).json({
      history: attempts.map((a) => ({
        id:           a._id,
        date:         a.date,
        puzzleNumber: a.puzzle?.puzzleNumber ?? null,
        answer:       a.puzzle?.answer       ?? null, // null only if puzzle was deleted
        guesses:      a.guesses,
        status:       a.status,
        score:        a.score,
        completedAt:  a.completedAt,
      })),
      totalPages:  Math.ceil(totalCount / limit),
      currentPage: page,
      totalCount,
    });
  } catch (error) {
    console.error("Error in getWordleHistory:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};