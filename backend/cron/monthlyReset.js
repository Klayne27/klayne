import cron from "node-cron";
import User from "../models/user.model.js";
import MonthlyWinners from "../models/monthlyWinners.model.js";

const resetMonthlyStats = cron.schedule(
  "0 0 1 * *", // midnight UTC on the 1st — same race-condition reasoning
  async () => {
    try {
      // ← was missing
      await performMonthlyReset();
    } catch (error) {
      console.error("Monthly Reset Error:", error);
    }
  },
  { scheduled: false },
);

export const performMonthlyReset = async () => {
  try {
    console.log("Starting Monthly Reset Logic...");

    const now = new Date();

    const lastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    lastMonthDate.setUTCMonth(lastMonthDate.getUTCMonth() - 1);
    const lastMonthISO = lastMonthDate.toISOString().slice(0, 7);

    const currentMonthISO = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 7);

    console.log(`Archiving winners for ${lastMonthISO}, resetting to ${currentMonthISO}`);

    const activeUsers = await User.find({ "monthlyStats.studyDuration": { $gt: 0 } })
      .select("_id")
      .lean();
    const activeUserIds = activeUsers.map((u) => u._id);

const topUsers = await User.find({
  "monthlyStats.lastResetMonth": { $in: [lastMonthISO, null] }, // studied last month or never reset
  "monthlyStats.studyDuration": { $gt: 0 },
})
  .sort({ "monthlyStats.studyDuration": -1 })
  .limit(3)
  .select("_id monthlyStats");

    // ── Bug 2 fix: actually save the winners ──────────────────────────────
    if (topUsers.length > 0) {
      const winnersData = topUsers.map((user, index) => ({
        user: user._id,
        rank: index + 1,
        studyDuration: user.monthlyStats.studyDuration,
      }));

      await MonthlyWinners.findOneAndUpdate(
        { month: lastMonthISO },
        { $set: { winners: winnersData } },
        { upsert: true },
      );
      console.log(`Saved ${winnersData.length} winners for ${lastMonthISO}`);
    } else {
      console.log(`No study activity for ${lastMonthISO}, skipping winners save`);
    }

    // ── Bug 1 fix: capture result ─────────────────────────────────────────
    const result = await User.updateMany(
      {},
      {
        $set: {
          "monthlyStats.studyDuration": 0,
          "monthlyStats.sessionsCompleted": 0,
          "monthlyStats.xpEarned": 0,
          "monthlyStats.lastResetMonth": currentMonthISO,
        },
      },
    );

    await User.updateMany(
      { _id: { $nin: activeUserIds } },
      { $set: { monthlyStudyStreak: 0, lastMonthlyStudyDate: null } },
    );

    console.log(
      `Monthly reset complete. ${result.modifiedCount} users reset for ${currentMonthISO}`,
    );
    return { success: true, month: lastMonthISO };
  } catch (error) {
    console.error("Monthly Reset Error:", error);
    throw error;
  }
};

export const startMonthlyCronJob = () => {
  resetMonthlyStats.start();
  console.log("Monthly leaderboard reset cron job started");
};

export const stopMonthlyCronJob = () => {
  resetMonthlyStats.stop();
  console.log("Monthly leaderboard reset cron job stopped");
};
