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

export const performWeeklyReset = async () => {
  const now = new Date();
  const thisMonday = getMondayOfWeek(now);
  const lastMondayDate = new Date(now);
  lastMondayDate.setUTCDate(lastMondayDate.getUTCDate() - 7);
  const lastMonday = getMondayOfWeek(lastMondayDate);

  // ── FIX: filter by weekStart === lastMonday ─────────────────────────────
  // Without this, users who already studied Monday morning will have had
  // their stats auto-reset to 0 by endStudySession before the cron fires.
  const topUsers = await User.find({
    "weeklyStats.weekStart": lastMonday, // ← KEY FIX
    "weeklyStats.studyDuration": { $gt: 0 },
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
    console.log(`No activity found for week of ${lastMonday}, skipping winners save`);
  }

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
  return { success: true, week: lastMonday };
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
