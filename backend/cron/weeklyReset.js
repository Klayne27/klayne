import cron from "node-cron";
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

const resetWeeklyStats = cron.schedule(
  "0 8 * * 1", // Monday at 8:00 AM UTC = Sunday Midnight UTC-8
  async () => {
    try {
      const now = new Date();
      const pdtDate = new Date(now.getTime() - 8 * 60 * 60 * 1000);

      const lastWeekDate = new Date(pdtDate);
      lastWeekDate.setUTCDate(lastWeekDate.getUTCDate() - 7);
      const lastWeekStart = getMondayOfWeek(lastWeekDate);

      const topUsers = await User.find({ "weeklyStats.studyDuration": { $gt: 0 } })
        .sort({ "weeklyStats.studyDuration": -1 })
        .limit(3);

      if (topUsers.length > 0) {
        const winnersData = topUsers.map((user, index) => ({
          user: user._id,
          rank: index + 1,
          studyDuration: user.weeklyStats.studyDuration,
        }));

        await WeeklyWinners.findOneAndUpdate(
          { weekStart: lastWeekStart },
          { $set: { winners: winnersData } },
          { upsert: true },
        );
      }

      const newWeekStart = getMondayOfWeek(pdtDate);
      await User.updateMany(
        {},
        {
          $set: {
            "weeklyStats.studyDuration": 0,
            "weeklyStats.sessionsCompleted": 0,
            "weeklyStats.xpEarned": 0,
            "weeklyStats.weekStart": newWeekStart,
          },
        },
      );
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
