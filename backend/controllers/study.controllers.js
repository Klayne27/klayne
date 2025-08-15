import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import StudySession from "../models/studySession.js";
import { io } from "../lib/socket.js";

// Helper function to check and award badges
const checkAndAwardBadges = async (user) => {
  // --- Study Duration Badges ---
  // 20 hours = 1200 minutes
  if (user.totalStudyDuration >= 1200 && !user.badges.includes("twenty-hour-scholar")) {
    user.badges.push("twenty-hour-scholar");
  }

  // 100 hours = 6000 minutes
  if (user.totalStudyDuration >= 6000 && !user.badges.includes("centurion-scholar")) {
    user.badges.push("centurion-scholar");
  }

  // 300 hours = 18000 minutes
  if (
    user.totalStudyDuration >= 18000 &&
    !user.badges.includes("three-hundred-hour-master")
  ) {
    user.badges.push("three-hundred-hour-master");
  }

  // --- Session Completion Badges ---
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

  // --- Study Streak Badges ---
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
    return 1500; // Base XP for level 2
  }
  return Math.floor(2000 * Math.pow(level - 1, 1.5));
};

// Main function to manage XP and leveling
const handleXPAndLeveling = async (user, duration) => {
  // Award XP based on duration (10 XP per minute)
  const xpGained = duration * 10; 
  user.pomodoroXP += xpGained;

  // Loop to check for multiple level-ups
  while (user.pomodoroXP >= xpForLevel(user.pomodoroLevel + 1)) {
    const xpNeededForNextLevel = xpForLevel(user.pomodoroLevel + 1);
    user.pomodoroXP -= xpNeededForNextLevel; // Carry over excess XP
    user.pomodoroLevel += 1;
  }
  await user.save();
};

export const startStudySession = async (req, res) => {
  try {
    const userId = req.user._id; // Optionally create a post to announce the session

    const newPost = await Post.create({
      user: userId,
      text: "Starting a study session... 📚",
    }); // Emit a Socket.IO event

    io.emit("studySessionStarted", {
      userId: userId,
      username: req.user.username,
      startedAt: new Date(),
    });

    res.status(200).json({ message: "Study session started", postId: newPost._id });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const endStudySession = async (req, res) => {
  try {
    const userId = req.user._id;
    const { duration, postId } = req.body;

    if (!duration) {
      return res.status(400).json({ error: "Duration is required" });
    }

    // Use findByIdAndUpdate to update the user document atomically.
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $inc: {
          totalStudyDuration: duration,
          totalSessionsCompleted: 1, // <-- ADD THIS LINE
        },
        $set: { lastStudyDate: new Date() },
        // We'll handle the streak update logic separately or in a more advanced way
      },
      { new: true } // Returns the updated document
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Streak logic needs to be handled separately because it's conditional
    const today = new Date().setHours(0, 0, 0, 0);
    const lastStudy = user.lastStudyDate
      ? new Date(user.lastStudyDate).setHours(0, 0, 0, 0)
      : null;
    const oneDay = 24 * 60 * 60 * 1000;

    let newStudyStreak = 1;
    if (lastStudy && today - lastStudy === oneDay) {
      newStudyStreak = user.studyStreak + 1;
    }

    // Now, update the streak. This will be the second atomic operation.
    await User.findByIdAndUpdate(userId, { $set: { studyStreak: newStudyStreak } });

    // Log the study session
    await StudySession.create({
      user: userId,
      duration,
      date: new Date(),
      post: postId,
    });

    // Update the "session started" post
    if (postId) {
      await Post.findByIdAndUpdate(postId, {
        text: `Just finished a ${duration}-minute study session! 💪`,
      });
    }

    await handleXPAndLeveling(user, duration);

    // Check and award badges with the updated user document
    await checkAndAwardBadges(user);

    // Emit a Socket.IO event
    io.emit("studySessionEnded", {
      userId: userId,
      username: req.user.username,
      duration,
    });

    res.status(200).json({ message: "Study session ended successfully" });
  } catch (error) {
    console.error("Error in endStudySession", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Before the try-catch block, destructure the query parameters
export const getStudyActivityFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const activityFeed = await StudySession.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "user",
        select: "username fullName",
        populate: { path: "profileImg", select: "imageUrl" },
      });

    // Also get the total count of documents to calculate total pages
    const totalSessions = await StudySession.countDocuments();
    const totalPages = Math.ceil(totalSessions / limit);

    // Send back the activity feed, the current page, and the total pages
    res.status(200).json({
      activityFeed,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page
    const skipIndex = (page - 1) * limit;

    // Get total count for pagination info
    const totalCount = await User.countDocuments();

    const leaderboard = await User.find()
      .sort({ totalStudyDuration: -1 })
      .skip(skipIndex) // Skip documents for previous pages
      .limit(limit) // Limit to the number of items per page
      .select("username fullName totalStudyDuration totalSessionsCompleted profileImg")
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
        "pomodoroSettings.sessionGoalCount": sessionGoalCount, // <-- Update this field
        "pomodoroSettings.autoplay": autoplay,
        "pomodoroSettings.isMuted": isMuted,
      },
      { new: true } // returns the updated document
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
