import cron from "node-cron";
import User from "../models/user.model.js";
import MonthlyWinners from "../models/monthlyWinners.model.js";

const resetMonthlyStats = cron.schedule(
  "0 0 1 * *",
  async () => {
    try {
      console.log("Starting monthly leaderboard reset...");

      // Step 1: Get the top 3 users from the just-ended month
      const topUsers = await User.find({
        "monthlyStats.studyDuration": { $gt: 0 },
      })
        .sort({ "monthlyStats.studyDuration": -1 })
        .limit(3)
        .select("monthlyStats");

      // Step 2: Prepare and save the data to the new collection
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthISO = lastMonth.toISOString().slice(0, 7);

      const winnersData = topUsers.map((user, index) => ({
        user: user._id,
        rank: index + 1,
        studyDuration: user.monthlyStats.studyDuration,
      }));

      await MonthlyWinners.findOneAndUpdate(
        { month: lastMonthISO },
        { $set: { winners: winnersData } },
        { upsert: true, new: true }
      );
      console.log(`Saved previous month's winners for ${lastMonthISO}.`);

      // Step 3: Reset the monthly stats for all users (your existing logic)
      const currentMonth = new Date().toISOString().slice(0, 7);
      const result = await User.updateMany(
        {
          $or: [
            { "monthlyStats.lastResetMonth": { $ne: currentMonth } },
            { "monthlyStats.lastResetMonth": null },
          ],
        },
        {
          $set: {
            "monthlyStats.studyDuration": 0,
            "monthlyStats.sessionsCompleted": 0,
            "monthlyStats.xpEarned": 0,
            "monthlyStats.lastResetMonth": currentMonth,
            "monthlyStudyStreak": 0,
            "lastMonthlyStudyDate": null,
          },
        }
      );
      console.log(`Monthly stats reset for ${result.modifiedCount} users.`);
    } catch (error) {
      console.error("Error during monthly leaderboard reset:", error);
    }
  },
  {
    scheduled: false,
  }
);

// Function to start the cron job
export const startMonthlyCronJob = () => {
  resetMonthlyStats.start();
  console.log("Monthly leaderboard reset cron job started");
};

// Function to stop the cron job
export const stopMonthlyCronJob = () => {
  resetMonthlyStats.stop();
  console.log("Monthly leaderboard reset cron job stopped");
};

// Manual function to reset monthly stats (for testing or manual triggers)
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
