// import { getMondayOfWeek } from "../cron/weeklyReset.js";
// import MonthlyWinners from "../models/monthlyWinners.model.js";
// import User from "../models/user.model.js";
// import WeeklyWinners from "../models/weeklyWinners.model.js";

// export const getWeeklyLeaderboard = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skipIndex = (page - 1) * limit;

//     const currentWeekStart = getMondayOfWeek(new Date());

//     const totalCount = await User.countDocuments({
//       "weeklyStats.studyDuration": { $gt: 0 },
//     });

//     const leaderboard = await User.find({
//       "weeklyStats.studyDuration": { $gt: 0 },
//     })
//       .sort({ "weeklyStats.studyDuration": -1 })
//       .skip(skipIndex)
//       .limit(limit)
//       .select(
//         "username fullName weeklyStats totalStudyDuration totalSessionsCompleted profileImg pomodoroLevel badges preferredBadge studyStreak nameColor equipped",
//       )
//       .populate({ path: "profileImg", select: "imageUrl" });

//     const transformed = leaderboard.map((user) => ({
//       ...user.toObject(),
//       totalStudyDuration: user.weeklyStats.studyDuration,
//       totalSessionsCompleted: user.weeklyStats.sessionsCompleted,
//     }));

//     res.status(200).json({
//       leaderboard: transformed,
//       totalPages: Math.ceil(totalCount / limit),
//       currentPage: page,
//       type: "weekly",
//       currentWeekStart,
//     });
//   } catch (error) {
//     console.error("Error in getWeeklyLeaderboard:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// export const getPreviousWeekWinners = async (req, res) => {
//   try {
//     const now = new Date();

//     // 1. Get the Monday of the CURRENT week
//     const currentMonday = getMondayOfWeek(now);

//     // 2. Get the Monday of the PREVIOUS week (the one the cron just processed)
//     const lastWeekDate = new Date(currentMonday);
//     lastWeekDate.setUTCDate(lastWeekDate.getUTCDate() - 7);
//     const lastWeekStart = lastWeekDate.toISOString().split("T")[0];

//     const previousWinners = await WeeklyWinners.findOne({
//       weekStart: lastWeekStart,
//     }).populate({
//       path: "winners.user",
//       select: "username fullName profileImg nameColor equipped",
//       populate: { path: "profileImg", select: "imageUrl" },
//     });

//     // If no winners found for calculated date, fallback to the absolute latest entry
//     if (!previousWinners) {
//       const latestEntry = await WeeklyWinners.findOne()
//         .sort({ weekStart: -1 })
//         .populate({
//           path: "winners.user",
//           select: "username fullName profileImg nameColor equipped",
//           populate: { path: "profileImg", select: "imageUrl" },
//         });
//       return res
//         .status(200)
//         .json(latestEntry || { winners: [], weekStart: lastWeekStart });
//     }

//     res.status(200).json(previousWinners);
//   } catch (error) {
//     console.error("Error fetching previous winners:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// export const getTotalLeaderboard = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skipIndex = (page - 1) * limit;

//     const totalCount = await User.countDocuments({ totalStudyDuration: { $gt: 0 } });

//     const leaderboard = await User.find({ totalStudyDuration: { $gt: 0 } })
//       .sort({ totalStudyDuration: -1 })
//       .skip(skipIndex)
//       .limit(limit)
//       .select(
//         "username fullName totalStudyDuration totalSessionsCompleted profileImg pomodoroLevel badges preferredBadge studyStreak equipped nameColor",
//       )
//       .populate({
//         path: "profileImg",
//         select: "imageUrl",
//       });

//     res.status(200).json({
//       leaderboard,
//       totalPages: Math.ceil(totalCount / limit),
//       currentPage: page,
//       type: "total",
//     });
//   } catch (error) {
//     console.error("Error in getTotalLeaderboard:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// export const getMonthlyLeaderboard = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skipIndex = (page - 1) * limit;

//     const currentMonth = new Date().toISOString().slice(0, 7);

//     const totalCount = await User.countDocuments({
//       "monthlyStats.studyDuration": { $gt: 0 },
//     });
//     const leaderboard = await User.find({ "monthlyStats.studyDuration": { $gt: 0 } })
//       .sort({ "monthlyStats.studyDuration": -1 })
//       .skip(skipIndex)
//       .limit(limit)
//       .select(
//         "username fullName monthlyStats totalStudyDuration totalSessionsCompleted profileImg pomodoroLevel badges preferredBadge monthlyStudyStreak nameColor equipped",
//       )
//       .populate({
//         path: "profileImg",
//         select: "imageUrl",
//       });

//     const transformedLeaderboard = leaderboard.map((user) => ({
//       ...user.toObject(),
//       totalStudyDuration: user.monthlyStats.studyDuration,
//       totalSessionsCompleted: user.monthlyStats.sessionsCompleted,
//     }));

//     res.status(200).json({
//       leaderboard: transformedLeaderboard,
//       totalPages: Math.ceil(totalCount / limit),
//       currentPage: page,
//       type: "monthly",
//       currentMonth: currentMonth,
//     });
//   } catch (error) {
//     console.error("Error in getMonthlyLeaderboard:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// export const getPreviousMonthWinners = async (req, res) => {
//   try {
//     // Simply find the latest archived month in the collection
//     const previousWinners = await MonthlyWinners.findOne()
//       .sort({ month: -1 }) // Sorts YYYY-MM strings: "2024-03" comes before "2024-02"
//       .populate({
//         path: "winners.user",
//         select: "username fullName profileImg nameColor equipped",
//         populate: {
//           path: "profileImg",
//           select: "imageUrl",
//         },
//       });

//     if (!previousWinners) {
//       // If the DB is totally empty, we can provide a fallback ISO string
//       const now = new Date();
//       const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
//       const fallbackISO = lastMonth.toISOString().slice(0, 7);

//       return res.status(200).json({ winners: [], month: fallbackISO });
//     }

//     res.status(200).json({
//       winners: previousWinners.winners,
//       month: previousWinners.month,
//     });
//   } catch (error) {
//     console.error("Error fetching previous monthly winners:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

import { getMondayOfWeek } from "../cron/weeklyReset.js";
import MonthlyWinners from "../models/monthlyWinners.model.js";
import User from "../models/user.model.js";
import WeeklyWinners from "../models/weeklyWinners.model.js";

// ── Weekly ────────────────────────────────────────────────────────────────────
export const getWeeklyLeaderboard = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skipIndex = (page - 1) * limit;

    const currentWeekStart = getMondayOfWeek(new Date());

    // ── FIX: only include users whose weekStart matches the current week ───────
    // Without this, a user whose cron-reset was missed (or who hasn't triggered
    // endStudySession yet) would appear with last week's totals.
    const filter = {
      "weeklyStats.studyDuration": { $gt: 0 },
      "weeklyStats.weekStart": currentWeekStart,
    };

    const totalCount = await User.countDocuments(filter);

    const leaderboard = await User.find(filter)
      .sort({ "weeklyStats.studyDuration": -1 })
      .skip(skipIndex)
      .limit(limit)
      .select(
        "username fullName weeklyStats totalStudyDuration totalSessionsCompleted profileImg pomodoroLevel badges preferredBadge studyStreak nameColor equipped",
      )
      .populate({ path: "profileImg", select: "imageUrl" });

    const transformed = leaderboard.map((user) => ({
      ...user.toObject(),
      totalStudyDuration: user.weeklyStats.studyDuration,
      totalSessionsCompleted: user.weeklyStats.sessionsCompleted,
    }));

    res.status(200).json({
      leaderboard: transformed,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      type: "weekly",
      currentWeekStart,
    });
  } catch (error) {
    console.error("Error in getWeeklyLeaderboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── Previous week winners ─────────────────────────────────────────────────────
export const getPreviousWeekWinners = async (req, res) => {
  try {
    const now = new Date();
    const currentMonday = getMondayOfWeek(now);

    const lastWeekDate = new Date(currentMonday);
    lastWeekDate.setUTCDate(lastWeekDate.getUTCDate() - 7);
    const lastWeekStart = lastWeekDate.toISOString().split("T")[0];

    const previousWinners = await WeeklyWinners.findOne({
      weekStart: lastWeekStart,
    }).populate({
      path: "winners.user",
      select: "username fullName profileImg nameColor equipped",
      populate: { path: "profileImg", select: "imageUrl" },
    });

    if (previousWinners) {
      return res.status(200).json(previousWinners);
    }

    // ── Fallback: cron hasn't run yet for the expected week ───────────────────
    // Instead of returning the most recent (possibly 2+ weeks old) entry, compute
    // on-the-fly from the live weeklyStats that belong to LAST week.
    // This covers the narrow window between Monday midnight and when the cron fires.
    const liveTopUsers = await User.find({
      "weeklyStats.studyDuration": { $gt: 0 },
      "weeklyStats.weekStart": lastWeekStart, // ← must belong to last week
    })
      .sort({ "weeklyStats.studyDuration": -1 })
      .limit(3)
      .select(
        "username fullName profileImg nameColor equipped weeklyStats pomodoroLevel badges preferredBadge",
      )
      .populate({ path: "profileImg", select: "imageUrl" });

    if (liveTopUsers.length > 0) {
      return res.status(200).json({
        weekStart: lastWeekStart,
        winners: liveTopUsers.map((u, i) => ({
          user: u,
          rank: i + 1,
          studyDuration: u.weeklyStats.studyDuration,
        })),
        _computed: true, // signals this is live data, not the cron snapshot
      });
    }

    // True fallback: no data at all for last week
    return res.status(200).json({ winners: [], weekStart: lastWeekStart });
  } catch (error) {
    console.error("Error fetching previous winners:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── Total ─────────────────────────────────────────────────────────────────────
export const getTotalLeaderboard = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skipIndex = (page - 1) * limit;

    const totalCount = await User.countDocuments({ totalStudyDuration: { $gt: 0 } });

    const leaderboard = await User.find({ totalStudyDuration: { $gt: 0 } })
      .sort({ totalStudyDuration: -1 })
      .skip(skipIndex)
      .limit(limit)
      .select(
        "username fullName totalStudyDuration totalSessionsCompleted profileImg pomodoroLevel badges preferredBadge studyStreak equipped nameColor",
      )
      .populate({ path: "profileImg", select: "imageUrl" });

    res.status(200).json({
      leaderboard,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      type: "total",
    });
  } catch (error) {
    console.error("Error in getTotalLeaderboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── Monthly ───────────────────────────────────────────────────────────────────
export const getMonthlyLeaderboard = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skipIndex = (page - 1) * limit;

    const currentMonth = new Date().toISOString().slice(0, 7);

    // ── FIX: only include users whose lastResetMonth matches the current month ─
    const filter = {
      "monthlyStats.studyDuration": { $gt: 0 },
      "monthlyStats.lastResetMonth": currentMonth,
    };

    const totalCount = await User.countDocuments(filter);

    const leaderboard = await User.find(filter)
      .sort({ "monthlyStats.studyDuration": -1 })
      .skip(skipIndex)
      .limit(limit)
      .select(
        "username fullName monthlyStats totalStudyDuration totalSessionsCompleted profileImg pomodoroLevel badges preferredBadge monthlyStudyStreak nameColor equipped",
      )
      .populate({ path: "profileImg", select: "imageUrl" });

    const transformedLeaderboard = leaderboard.map((user) => ({
      ...user.toObject(),
      totalStudyDuration: user.monthlyStats.studyDuration,
      totalSessionsCompleted: user.monthlyStats.sessionsCompleted,
    }));

    res.status(200).json({
      leaderboard: transformedLeaderboard,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      type: "monthly",
      currentMonth,
    });
  } catch (error) {
    console.error("Error in getMonthlyLeaderboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── Previous month winners ────────────────────────────────────────────────────
export const getPreviousMonthWinners = async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const lastMonthDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
    );
    const lastMonthISO = lastMonthDate.toISOString().slice(0, 7);

    // First try the exact archived entry for last month
    const previousWinners = await MonthlyWinners.findOne({
      month: lastMonthISO,
    }).populate({
      path: "winners.user",
      select: "username fullName profileImg nameColor equipped",
      populate: { path: "profileImg", select: "imageUrl" },
    });

    if (previousWinners) {
      return res
        .status(200)
        .json({ winners: previousWinners.winners, month: previousWinners.month });
    }

    // ── Fallback: cron hasn't fired yet for last month ────────────────────────
    // Compute on-the-fly from users whose lastResetMonth is still the previous month
    // (i.e., the cron reset hasn't updated them yet — they haven't studied this month).
    const liveTopUsers = await User.find({
      "monthlyStats.studyDuration": { $gt: 0 },
      "monthlyStats.lastResetMonth": lastMonthISO, // ← still on last month
    })
      .sort({ "monthlyStats.studyDuration": -1 })
      .limit(3)
      .select(
        "username fullName profileImg nameColor equipped monthlyStats pomodoroLevel badges preferredBadge",
      )
      .populate({ path: "profileImg", select: "imageUrl" });

    if (liveTopUsers.length > 0) {
      return res.status(200).json({
        month: lastMonthISO,
        winners: liveTopUsers.map((u, i) => ({
          user: u,
          rank: i + 1,
          studyDuration: u.monthlyStats.studyDuration,
        })),
        _computed: true,
      });
    }

    return res.status(200).json({ winners: [], month: lastMonthISO });
  } catch (error) {
    console.error("Error fetching previous monthly winners:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};