import User from "../models/user.model.js";
import StudySession from "../models/studySession.js";
import { io } from "../lib/socket.js";

const checkAndAwardBadges = async (user) => {
  if (user.totalStudyDuration >= 1200 && !user.badges.includes("twenty-hour-scholar")) {
    user.badges.push("twenty-hour-scholar");
  }
  if (user.totalStudyDuration >= 6000 && !user.badges.includes("centurion-scholar")) {
    user.badges.push("centurion-scholar");
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
    return 1500;
  }
  return Math.floor(2000 * Math.pow(level - 1, 1.5));
};

const handleXPAndLeveling = async (user, duration) => {
  const xpGained = duration * 10;
  user.pomodoroXP += xpGained;
  while (user.pomodoroXP >= xpForLevel(user.pomodoroLevel + 1)) {
    const xpNeededForNextLevel = xpForLevel(user.pomodoroLevel + 1);
    user.pomodoroXP -= xpNeededForNextLevel;
    user.pomodoroLevel += 1;
  }
  await user.save();
};

const processPostSessionTasks = async (userId, duration) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;
    await handleXPAndLeveling(user, duration);
    await checkAndAwardBadges(user);
    io.emit("studySessionEnded", {
      userId: userId,
      username: user.username,
      duration,
    });
  } catch (error) {
    console.error("Error in post-session processing:", error.message);
  }
};

export const startStudySession = async (req, res) => {
  try {
    const userId = req.user._id;
    io.emit("studySessionStarted", {
      userId: userId,
      username: req.user.username,
      startedAt: new Date(),
    });
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
    await StudySession.create({
      user: userId,
      duration,
      date: new Date(),
    });
    const user = await User.findById(userId);
    user.totalStudyDuration += duration;
    user.totalSessionsCompleted += 1;
    const today = new Date().setHours(0, 0, 0, 0);
    const lastStudy = user.lastStudyDate
      ? new Date(user.lastStudyDate).setHours(0, 0, 0, 0)
      : null;
    const oneDay = 24 * 60 * 60 * 1000;
    if (lastStudy && today - lastStudy === oneDay) {
      user.studyStreak += 1;
    } else if (!lastStudy || today - lastStudy > oneDay) {
      user.studyStreak = 1;
    }
    user.lastStudyDate = new Date();
    await user.save();
    res.status(200).json({ message: "Study session logged successfully" });
    processPostSessionTasks(userId, duration);
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
    const activityFeed = await StudySession.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "user",
        select: "username fullName",
        populate: { path: "profileImg", select: "imageUrl" },
      });
    const totalSessions = await StudySession.countDocuments();
    const totalPages = Math.ceil(totalSessions / limit);
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skipIndex = (page - 1) * limit;
    const totalCount = await User.countDocuments();
    const leaderboard = await User.find()
      .sort({ totalStudyDuration: -1 })
      .skip(skipIndex)
      .limit(limit)
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
