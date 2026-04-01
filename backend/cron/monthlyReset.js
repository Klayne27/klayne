import cron from "node-cron";
import User from "../models/user.model.js";
import MonthlyWinners from "../models/monthlyWinners.model.js";

const resetMonthlyStats = cron.schedule(
  "0 8 1 * *",
  async () => {
    await performMonthlyReset();
  },
  { scheduled: false },
);

export const performMonthlyReset = async () => {
  try {
    console.log("Starting Monthly Reset Logic...");

    const topUsers = await User.find({ "monthlyStats.studyDuration": { $gt: 0 } })
      .sort({ "monthlyStats.studyDuration": -1 })
      .limit(3);

    const now = new Date();
    const pdtDate = new Date(now.getTime() - 8 * 60 * 60 * 1000);
    const targetMonth = new Date(pdtDate);
    targetMonth.setUTCDate(1);
    targetMonth.setUTCMonth(targetMonth.getUTCMonth() - 1);
    const lastMonthISO = targetMonth.toISOString().slice(0, 7);

    // 3. Save Winners
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
      console.log(`Saved winners for ${lastMonthISO}`);
    }

    // 4. Reset All Users
    const currentMonthISO = pdtDate.toISOString().slice(0, 7);
    const result = await User.updateMany(
      {},
      {
        $set: {
          "monthlyStats.studyDuration": 0,
          "monthlyStats.sessionsCompleted": 0,
          "monthlyStats.xpEarned": 0,
          "monthlyStats.lastResetMonth": currentMonthISO,
          monthlyStudyStreak: 0,
          lastMonthlyStudyDate: null,
        },
      },
    );

    console.log(`Reset successful for ${result.modifiedCount} users.`);
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

export const manualMonthlyReset = async () => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const result = await User.updateMany(
      {},
      {
        $set: {
          "monthlyStats.studyDuration": 0,
          "monthlyStats.sessionsCompleted": 0,
          "monthlyStats.xpEarned": 0,
          "monthlyStats.lastResetMonth": currentMonth,
        },
      }
    );

    console.log(`Manual monthly reset completed. Updated ${result.modifiedCount} users.`);
    return result;
  } catch (error) {
    console.error("Error during manual monthly reset:", error);
    throw error;
  }
};
