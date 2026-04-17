import MonthlyWinners from "../models/monthlyWinners.model.js";
import User from "../models/user.model.js";
import WeeklyWinners from "../models/weeklyWinners.model.js";

const getMondayOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
};

export const getWeeklyLeaderboard = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skipIndex = (page - 1) * limit;

    const currentWeekStart = getMondayOfWeek(new Date());

    const totalCount = await User.countDocuments({
      "weeklyStats.studyDuration": { $gt: 0 },
      "weeklyStats.weekStart": currentWeekStart,
    });

    const leaderboard = await User.find({
      "weeklyStats.studyDuration": { $gt: 0 },
      "weeklyStats.weekStart": currentWeekStart,
    })
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

export const getPreviousWeekWinners = async (req, res) => {
  try {
    const now = new Date();

    // 1. Get the Monday of the CURRENT week
    const currentMonday = getMondayOfWeek(now);

    // 2. Get the Monday of the PREVIOUS week (the one the cron just processed)
    const lastWeekDate = new Date(currentMonday);
    lastWeekDate.setUTCDate(lastWeekDate.getUTCDate() - 7);
    const lastWeekStart = getMondayOfWeek(lastWeekDate);

    const previousWinners = await WeeklyWinners.findOne({
      weekStart: lastWeekStart,
    }).populate({
      path: "winners.user",
      select: "username fullName profileImg",
      populate: { path: "profileImg", select: "imageUrl" },
    });

    // If no winners found for calculated date, fallback to the absolute latest entry
    if (!previousWinners) {
      const latestEntry = await WeeklyWinners.findOne()
        .sort({ weekStart: -1 })
        .populate({
          path: "winners.user",
          select: "username fullName profileImg",
          populate: { path: "profileImg", select: "imageUrl" },
        });
      return res
        .status(200)
        .json(latestEntry || { winners: [], weekStart: lastWeekStart });
    }

    res.status(200).json(previousWinners);
  } catch (error) {
    console.error("Error fetching previous winners:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

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
        "username fullName totalStudyDuration totalSessionsCompleted profileImg pomodoroLevel badges preferredBadge studyStreak equipped",
      )
      .populate({
        path: "profileImg",
        select: "imageUrl",
      });

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

export const getMonthlyLeaderboard = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skipIndex = (page - 1) * limit;

    const currentMonth = new Date().toISOString().slice(0, 7);

    const totalCount = await User.countDocuments({
      "monthlyStats.studyDuration": { $gt: 0 },
    });
    const leaderboard = await User.find({ "monthlyStats.studyDuration": { $gt: 0 } })
      .sort({ "monthlyStats.studyDuration": -1 })
      .skip(skipIndex)
      .limit(limit)
      .select(
        "username fullName monthlyStats totalStudyDuration totalSessionsCompleted profileImg pomodoroLevel badges preferredBadge monthlyStudyStreak nameColor equipped",
      )
      .populate({
        path: "profileImg",
        select: "imageUrl",
      });

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
      currentMonth: currentMonth,
    });
  } catch (error) {
    console.error("Error in getMonthlyLeaderboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPreviousMonthWinners = async (req, res) => {
  try {
    // Simply find the latest archived month in the collection
    const previousWinners = await MonthlyWinners.findOne()
      .sort({ month: -1 }) // Sorts YYYY-MM strings: "2024-03" comes before "2024-02"
      .populate({
        path: "winners.user",
        select: "username fullName profileImg",
        populate: {
          path: "profileImg",
          select: "imageUrl",
        },
      });

    if (!previousWinners) {
      // If the DB is totally empty, we can provide a fallback ISO string
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const fallbackISO = lastMonth.toISOString().slice(0, 7);

      return res.status(200).json({ winners: [], month: fallbackISO });
    }

    res.status(200).json({
      winners: previousWinners.winners,
      month: previousWinners.month,
    });
  } catch (error) {
    console.error("Error fetching previous monthly winners:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};