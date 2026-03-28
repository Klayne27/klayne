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
  "0 0 * * 1", // Every Monday at midnight UTC
  async () => {
    try {
      console.log("Starting weekly leaderboard reset...");

      const lastWeekMonday = new Date();
      lastWeekMonday.setUTCDate(lastWeekMonday.getUTCDate() - 7);
      const lastWeekStart = getMondayOfWeek(lastWeekMonday);

      // Save top 3 from the week that just ended
      const topUsers = await User.find({
        "weeklyStats.studyDuration": { $gt: 0 },
        "weeklyStats.weekStart": lastWeekStart,
      })
        .sort({ "weeklyStats.studyDuration": -1 })
        .limit(3)
        .select("weeklyStats");

      const winnersData = topUsers.map((user, index) => ({
        user: user._id,
        rank: index + 1,
        studyDuration: user.weeklyStats.studyDuration,
      }));

      if (winnersData.length > 0) {
        await WeeklyWinners.findOneAndUpdate(
          { weekStart: lastWeekStart },
          { $set: { winners: winnersData } },
          { upsert: true, new: true },
        );
        console.log(`Saved weekly winners for week of ${lastWeekStart}.`);
      }

      // Reset weekly stats for all users whose weekStart is not the new week
      const newWeekStart = getMondayOfWeek(new Date());
      const result = await User.updateMany(
        { "weeklyStats.weekStart": { $ne: newWeekStart } },
        {
          $set: {
            "weeklyStats.studyDuration": 0,
            "weeklyStats.sessionsCompleted": 0,
            "weeklyStats.xpEarned": 0,
            "weeklyStats.weekStart": newWeekStart,
          },
        },
      );
      console.log(`Weekly stats reset for ${result.modifiedCount} users.`);
    } catch (error) {
      console.error("Error during weekly leaderboard reset:", error);
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
