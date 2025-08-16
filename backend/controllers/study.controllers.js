import User from "../models/user.model.js";
import StudySession from "../models/studySession.js";
import LevelUp from "../models/levelup.model.js";

const checkAndAwardBadges = async (user) => {
  if (user.totalStudyDuration >= 1500 && !user.badges.includes("twenty-hour-scholar")) {
    user.badges.push("twentyfive-hour-scholar");
  }
  if (user.totalStudyDuration >= 6000 && !user.badges.includes("centurion-scholar")) {
    user.badges.push("onehundred-hour-scholar");
  }
  if (
    user.totalStudyDuration >= 18000 &&
    !user.badges.includes("three-hundred-hour-master")
  ) {
    user.badges.push("three-hundred-hour-master");
  }
  if (
    user.totalSessionsCompleted >= 10 &&
    !user.badges.includes("ten-sessions-achiever")
  ) {
    user.badges.push("ten-sessions-achiever");
  }
  if (user.totalSessionsCompleted >= 50 && !user.badges.includes("fifty-sessions-pro")) {
    user.badges.push("fifty-sessions-pro");
  }
  if (user.totalSessionsCompleted >= 150 && !user.badges.includes("session-master")) {
    user.badges.push("session-master");
  }
  if (user.studyStreak >= 7 && !user.badges.includes("seven-day-streak")) {
    user.badges.push("seven-day-streak");
  }
  if (user.studyStreak >= 14 && !user.badges.includes("fourteen-day-streak")) {
    user.badges.push("fourteen-day-streak");
  }
  if (user.studyStreak >= 30 && !user.badges.includes("thirty-day-streak")) {
    user.badges.push("thirty-day-streak");
  }
  await user.save();
};

const xpForLevel = (level) => {
  if (level <= 1) {
    return 500; // ~2 sessions to reach level 2
  }
  return Math.floor(300 + level * 200 + Math.pow(level - 1, 1.3) * 100);
};

const handleXPAndLeveling = async (user, duration) => {
  // XP gained is 10 per minute of study
  let xpGained;
  if (duration >= 120) {
    xpGained = duration * 20; // 20 XP for sessions 2 hours (120 duration) or more
  } else if (duration > 60) {
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

export const startStudySession = async (req, res) => {
  try {
    const userId = req.user._id;
    res.status(200).json({ message: "Study session started" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
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
    user.totalStudyDuration += duration;
    user.totalSessionsCompleted += 1;

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

    await user.save();

    // Process XP and leveling
    const xpResult = await handleXPAndLeveling(user, duration);

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

    // Fetch study sessions and level-ups in parallel
    const [studySessions, levelUps] = await Promise.all([
      StudySession.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "user",
          select: "username fullName badges",
          populate: { path: "profileImg", select: "imageUrl" },
        }),
      LevelUp.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "user",
          select: "username fullName badges",
          populate: { path: "profileImg", select: "imageUrl" },
        }),
    ]);

    // Combine and sort all activities by createdAt date
    const combinedFeed = [...studySessions, ...levelUps];
    combinedFeed.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // You might want to limit the combined feed to ensure a consistent page size
    const paginatedFeed = combinedFeed.slice(0, limit);

    const totalSessions = await StudySession.countDocuments();
    const totalLevelUps = await LevelUp.countDocuments();
    const totalPages = Math.ceil((totalSessions + totalLevelUps) / limit);

    res.status(200).json({
      activityFeed: paginatedFeed,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skipIndex = (page - 1) * limit;
    const totalCount = await User.countDocuments();
    const leaderboard = await User.find()
      .sort({ totalStudyDuration: -1 })
      .skip(skipIndex)
      .limit(limit)
      .select(
        "username fullName totalStudyDuration totalSessionsCompleted profileImg pomodoroLevel badges"
      )
      .populate({
        path: "profileImg",
        select: "imageUrl",
      });
    res.status(200).json({
      leaderboard,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

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
