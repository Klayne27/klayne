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
    const lastMonthDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
    );
    const lastMonthISO = lastMonthDate.toISOString().slice(0, 7);
    const currentMonthISO = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 7);

    console.log(`Archiving winners for ${lastMonthISO}, resetting to ${currentMonthISO}`);

    // Step 1: all active users (for streak protection)
    const allActiveIds = await User.find({ "monthlyStats.studyDuration": { $gt: 0 } })
      .select("_id")
      .lean()
      .then((users) => users.map((u) => u._id));

    // Step 2: top 3 winners
    const topUsers = await User.find({ "monthlyStats.studyDuration": { $gt: 0 } })
      .sort({ "monthlyStats.studyDuration": -1 })
      .limit(3)
      .select("_id monthlyStats");

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
    }

    // Step 3: reset everyone's monthly stats
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

    // Step 4: break monthly streak only for inactive non-vacation users
    await User.updateMany(
      { _id: { $nin: allActiveIds }, isVacationMode: { $ne: true } },
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
