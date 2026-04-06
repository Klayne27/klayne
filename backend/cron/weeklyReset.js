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
  "0 8 * * 1", // 08:00 UTC every Monday = 00:00 PST / 01:00 PDT
  async () => {
    try {
      const now = new Date();

      // Current Monday (today) — this becomes the new week's start
      const thisMonday = getMondayOfWeek(now);

      // Last Monday — this is the week we're archiving winners for
      const lastMondayDate = new Date(now);
      lastMondayDate.setUTCDate(lastMondayDate.getUTCDate() - 7);
      const lastMonday = getMondayOfWeek(lastMondayDate);

      // Save top 3 from the week that just ended
      const topUsers = await User.find({ "weeklyStats.studyDuration": { $gt: 0 } })
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
        console.log(`No study activity for week of ${lastMonday}, skipping winners save`);
      }

      // Reset everyone's weekly stats for the new week
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

      console.log(
        `Weekly reset complete. ${result.modifiedCount} users reset. New week: ${thisMonday}`,
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
