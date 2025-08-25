import User from "../models/user.model.js";
import StudySession from "../models/studySession.js";
import LevelUp from "../models/levelup.model.js";

const checkAndAwardBadges = async (user) => {
  const newBadges = [];
  const existingBadges = new Set(user.badges);

  // Study Duration Badges
  if (user.totalStudyDuration >= 1500 && !existingBadges.has("twentyfive-hour-scholar")) {
    newBadges.push("twentyfive-hour-scholar");
  }
  if (user.totalStudyDuration >= 6000 && !existingBadges.has("onehundred-hour-scholar")) {
    newBadges.push("onehundred-hour-scholar");
  }
  if (
    user.totalStudyDuration >= 18000 &&
    !existingBadges.has("three-hundred-hour-master")
  ) {
    newBadges.push("three-hundred-hour-master");
  }

  // Session Completion Badges
  if (user.totalSessionsCompleted >= 10 && !existingBadges.has("ten-sessions-achiever")) {
    newBadges.push("ten-sessions-achiever");
  }
  if (user.totalSessionsCompleted >= 50 && !existingBadges.has("fifty-sessions-pro")) {
    newBadges.push("fifty-sessions-pro");
  }
  if (user.totalSessionsCompleted >= 150 && !existingBadges.has("session-master")) {
    newBadges.push("session-master");
  }

  // Study Streak Badges
  if (user.studyStreak >= 7 && !existingBadges.has("seven-day-streak")) {
    newBadges.push("seven-day-streak");
  }
  if (user.studyStreak >= 14 && !existingBadges.has("fourteen-day-streak")) {
    newBadges.push("fourteen-day-streak");
  }
  if (user.studyStreak >= 30 && !existingBadges.has("thirty-day-streak")) {
    newBadges.push("thirty-day-streak");
  }

  if (newBadges.length > 0) {
    user.badges = [...new Set([...user.badges, ...newBadges])];
    await user.save();
  }
};

const xpForLevel = (level) => {
  if (level <= 1) {
    return 500;
  }
  return Math.floor(300 + level * 200 + Math.pow(level - 1, 1.3) * 100);
};

const handleXPAndLeveling = async (user, duration) => {
  // XP gained is 10 per minute of study
  let xpGained;
  if (duration >= 120) {
    xpGained = duration * 20; // 20 XP for sessions 2 hours (120 duration) or more
  } else if (duration >= 60) {
    xpGained = duration * 15; // 15 XP for sessions over 60 duration
  } else {
    xpGained = duration * 10; // 10 XP for all other sessions
  }
  const initialLevel = user.pomodoroLevel;

  user.pomodoroXP += xpGained;
  let levelsGained = [];

  // Check for level up. Loop in case of multiple level ups from one session.
  let xpNeededForCurrentLevel = xpForLevel(user.pomodoroLevel + 1); // XP needed for NEXT level

  while (user.pomodoroXP >= xpNeededForCurrentLevel) {
    // Subtract the XP needed for this level up
    user.pomodoroXP -= xpNeededForCurrentLevel;

    // Increment the user's level
    user.pomodoroLevel += 1;
    levelsGained.push(user.pomodoroLevel);

    // Create a record of the level up event for the activity feed
    await LevelUp.create({
      user: user._id,
      newLevel: user.pomodoroLevel,
    });

    // Get the XP needed for the next level
    xpNeededForCurrentLevel = xpForLevel(user.pomodoroLevel + 1);
  }

  await user.save();

  return {
    xpGained,
    levelsGained,
    finalLevel: user.pomodoroLevel,
    finalXP: user.pomodoroXP,
    xpNeededForNext: xpNeededForCurrentLevel,
  };
};

export const endStudySession = async (req, res) => {
  try {
    const userId = req.user._id;
    const { duration } = req.body;

    if (!duration) {
      return res.status(400).json({ error: "Duration is required" });
    }

    // Create study session record
    await StudySession.create({
      user: userId,
      duration,
      date: new Date(),
    });

    // Update user stats
    const user = await User.findById(userId);

    // Helper function to reset monthly stats if needed
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    if (
      !user.monthlyStats.lastResetMonth ||
      user.monthlyStats.lastResetMonth !== currentMonth
    ) {
      user.monthlyStats.studyDuration = 0;
      user.monthlyStats.sessionsCompleted = 0;
      user.monthlyStats.xpEarned = 0;
      user.monthlyStats.lastResetMonth = currentMonth;
    }

    // Update total stats (all-time)
    user.totalStudyDuration += duration;
    user.totalSessionsCompleted += 1;

    // Update monthly stats
    user.monthlyStats.studyDuration += duration;
    user.monthlyStats.sessionsCompleted += 1;

    const getDateString = (date) => {
      return date.toISOString().split("T")[0];
    };

    // Updated streak logic in endStudySession
    const today = new Date();
    const todayString = getDateString(today);
    const lastStudyDate = user.lastStudyDate ? new Date(user.lastStudyDate) : null;
    const lastStudyString = lastStudyDate ? getDateString(lastStudyDate) : null;

    if (!lastStudyDate) {
      // First time studying - start streak at 1
      user.studyStreak = 1;
    } else if (lastStudyString === todayString) {
      // Already studied today - don't change streak
      // (Multiple sessions in same day don't affect streak)
    } else {
      // Calculate yesterday's date string
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = getDateString(yesterday);

      if (lastStudyString === yesterdayString) {
        // Studied yesterday, increment streak
        user.studyStreak += 1;
      } else {
        // Gap in studying - reset streak to 1 (today's session)
        user.studyStreak = 1;
      }
    }

    // Always update lastStudyDate to today
    user.lastStudyDate = today;

     const lastMonthlyStudyDate = user.lastMonthlyStudyDate
       ? new Date(user.lastMonthlyStudyDate)
       : null;
     const lastMonthlyStudyString = lastMonthlyStudyDate
       ? getDateString(lastMonthlyStudyDate)
       : null;

     if (!lastMonthlyStudyDate) {
       user.monthlyStudyStreak = 1;
     } else if (lastMonthlyStudyString === todayString) {
       // Don't change streak
     } else {
       const yesterday = new Date(today);
       yesterday.setDate(yesterday.getDate() - 1);
       const yesterdayString = getDateString(yesterday);

       if (lastMonthlyStudyString === yesterdayString) {
         user.monthlyStudyStreak += 1;
       } else {
         user.monthlyStudyStreak = 1;
       }
     }
     user.lastMonthlyStudyDate = today;

    await user.save();

    // Process XP and leveling
    const xpResult = await handleXPAndLeveling(user, duration);

    // Update monthly XP
    if (xpResult && xpResult.xpEarned) {
      user.monthlyStats.xpEarned += xpResult.xpEarned;
      await user.save();
    }

    // Award badges
    await checkAndAwardBadges(user);

    res.status(200).json({
      message: "Study session logged successfully",
      xpResult,
    });
  } catch (error) {
    console.error("Error in endStudySession", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getStudyActivityFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Use a single aggregation pipeline for both collections
    const combinedPipeline = [
      {
        $unionWith: {
          coll: "levelups", // Assuming the collection name is 'levelups'
        },
      },
      {
        $sort: { createdAt: -1 }, // Sort by date to get a single, chronological feed
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      // You may need a lookup to populate the user data here
      {
        $lookup: {
          from: "users", // Assuming your user collection is named 'users'
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $lookup: {
          from: "images",
          localField: "user.profileImg",
          foreignField: "_id",
          as: "user.profileImg",
        },
      },
      {
        $unwind: { path: "$user.profileImg", preserveNullAndEmptyArrays: true },
      },
    ];

    const totalCountPipeline = [
      {
        $unionWith: {
          coll: "levelups",
        },
      },
      {
        $count: "totalCount",
      },
    ];

    // Execute both pipelines in parallel
    const [combinedResults, totalCountResult] = await Promise.all([
      StudySession.aggregate(combinedPipeline),
      StudySession.aggregate(totalCountPipeline),
    ]);

    const totalActivities =
      totalCountResult.length > 0 ? totalCountResult[0].totalCount : 0;
    const totalPages = Math.ceil(totalActivities / limit);

    res.status(200).json({
      activityFeed: combinedResults,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error("Error in getStudyActivityFeed:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// export const getLeaderboard = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skipIndex = (page - 1) * limit;
//     const totalCount = await User.countDocuments();
//     const leaderboard = await User.find()
//       .sort({ totalStudyDuration: -1 })
//       .skip(skipIndex)
//       .limit(limit)
//       .select(
//         "username fullName totalStudyDuration totalSessionsCompleted profileImg pomodoroLevel badges studyStreak"
//       )
//       .populate({
//         path: "profileImg",
//         select: "imageUrl",
//       });
//     res.status(200).json({
//       leaderboard,
//       totalPages: Math.ceil(totalCount / limit),
//       currentPage: page,
//     });
//   } catch (error) {
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

export const updatePomodoroSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      sessionDuration,
      shortBreakDuration,
      longBreakDuration,
      sessionsBeforeLongBreak,
      sessionGoalCount,
      autoplay,
      isMuted,
      skipBreaks,
    } = req.body;
    const user = await User.findByIdAndUpdate(
      userId,
      {
        "pomodoroSettings.sessionDuration": sessionDuration,
        "pomodoroSettings.shortBreakDuration": shortBreakDuration,
        "pomodoroSettings.longBreakDuration": longBreakDuration,
        "pomodoroSettings.sessionsBeforeLongBreak": sessionsBeforeLongBreak,
        "pomodoroSettings.sessionGoalCount": sessionGoalCount,
        "pomodoroSettings.autoplay": autoplay,
        "pomodoroSettings.isMuted": isMuted,
        "pomodoroSettings.skipBreaks": skipBreaks,
      },
      { new: true }
    );
    res.status(200).json({ message: "Settings updated successfully", user });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPomodoroSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("pomodoroSettings");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(user.pomodoroSettings);
  } catch (error) {
    console.error("Error in getPomodoroSettings:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserBadges = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("badges");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(user.badges);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
