import cron from "node-cron";
import User from "../models/user.model.js";
import WeeklyWinners from "../models/weeklyWinners.model.js";

export const getMondayOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
};

export const performWeeklyReset = async () => {
  const now = new Date();
  const thisMonday = getMondayOfWeek(now);
  const lastMondayDate = new Date(now);
  lastMondayDate.setUTCDate(lastMondayDate.getUTCDate() - 7);
  const lastMonday = getMondayOfWeek(lastMondayDate);

  try {
    // ── Step 1: Capture winners BEFORE any reset ──────────────────────────
    // Do NOT filter by weekStart — at midnight Monday, anyone with
    // studyDuration > 0 is a valid last-week participant regardless of
    // whether endStudySession already advanced their weekStart to thisMonday.
    const topUsers = await User.find({
      "weeklyStats.studyDuration": { $gt: 0 }, // ← removed weekStart filter
    })
      .sort({ "weeklyStats.studyDuration": -1 })
      .limit(3)
      .select("_id weeklyStats");

    if (topUsers.length > 0) {
      const winnersData = topUsers.map((user, index) => ({
        user: user._id,
        rank: index + 1,
        studyDuration: user.weeklyStats.studyDuration,
      }));
      await WeeklyWinners.findOneAndUpdate(
        { weekStart: lastMonday },
        { $set: { winners: winnersData } },
        { upsert: true },
      );
      console.log(`Saved ${winnersData.length} winners for week of ${lastMonday}`);
    } else {
      console.log(`No study activity this week, skipping winners save`);
    }

    // ── Step 2: Capture active users for streak logic (same query) ────────
    const activeUserIds = topUsers.map((u) => u._id);
    // If you need ALL active users (not just top 3) for streak purposes,
    // run a separate lean query:
    const allActiveIds = await User.find({
      "weeklyStats.studyDuration": { $gt: 0 },
    })
      .select("_id")
      .lean()
      .then((users) => users.map((u) => u._id));

    // ── Step 3: Reset everyone ────────────────────────────────────────────
    const result = await User.updateMany(
      {},
      {
        $set: {
          "weeklyStats.studyDuration": 0,
          "weeklyStats.sessionsCompleted": 0,
          "weeklyStats.xpEarned": 0,
          "weeklyStats.weekStart": thisMonday,
        },
      },
    );

    // ── Step 4: Break streak for users who didn't study this week ─────────
    await User.updateMany(
      { _id: { $nin: allActiveIds } },
      { $set: { studyStreak: 0, lastStudyDate: null } },
    );

    console.log(
      `Weekly reset complete. ${result.modifiedCount} users reset. New week: ${thisMonday}`,
    );
    return { success: true, week: lastMonday };
  } catch (error) {
    console.error(
      `Weekly reset FAILED (lastMonday=${lastMonday}, thisMonday=${thisMonday}):`,
      error,
    );
    throw error;
  }
};

const resetWeeklyStats = cron.schedule(
  "0 0 * * 1", // midnight UTC Monday — runs before any Monday sessions
  async () => {
    try {
      await performWeeklyReset();
    } catch (error) {
      console.error("Weekly Reset Error:", error);
    }
  },
  { scheduled: false },
);

export const startWeeklyCronJob = () => {
  resetWeeklyStats.start();
  console.log("Weekly leaderboard reset cron job started");
};

export const stopWeeklyCronJob = () => {
  resetWeeklyStats.stop();
};
