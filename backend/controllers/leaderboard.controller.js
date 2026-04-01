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
        "username fullName weeklyStats totalStudyDuration totalSessionsCompleted profileImg pomodoroLevel badges preferredBadge studyStreak",
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
    const pdtDate = new Date(now.getTime() - 8 * 60 * 60 * 1000);

    const lastWeekDate = new Date(pdtDate);
    lastWeekDate.setUTCDate(lastWeekDate.getUTCDate() - 7);
    const lastWeekStart = getMondayOfWeek(lastWeekDate);

    const previousWinners = await WeeklyWinners.findOne({
      weekStart: lastWeekStart,
    }).populate({
      path: "winners.user",
      select: "username fullName profileImg",
      populate: { path: "profileImg", select: "imageUrl" },
    });

    res.status(200).json(previousWinners || { winners: [], weekStart: lastWeekStart });
  } catch (error) {
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
        "username fullName totalStudyDuration totalSessionsCompleted profileImg pomodoroLevel badges preferredBadge studyStreak",
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
        "username fullName monthlyStats totalStudyDuration totalSessionsCompleted profileImg pomodoroLevel badges preferredBadge monthlyStudyStreak",
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
    const now = new Date();

    const aoetDate = new Date(now.getTime() - 8 * 60 * 60 * 1000);

    const targetMonth = new Date(aoetDate);
    targetMonth.setUTCDate(1);

    targetMonth.setUTCMonth(targetMonth.getUTCMonth() - 1);

    const lastMonthISO = targetMonth.toISOString().slice(0, 7);

    const previousWinners = await MonthlyWinners.findOne({ month: lastMonthISO })
      .select("winners month")
      .populate({
        path: "winners.user",
        select: "username fullName",
        populate: {
          path: "profileImg",
          select: "imageUrl",
        },
      });

    if (!previousWinners) {
      return res.status(200).json({ winners: [], month: lastMonthISO });
    }

    res.status(200).json({
      winners: previousWinners.winners,
      month: previousWinners.month,
    });
  } catch (error) {
    console.error("Error fetching previous winners:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
