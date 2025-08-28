import User from "../models/user.model.js";
import StudySession from "../models/studySession.js";
import { checkAndAwardBadges, handleXPAndLeveling } from "../lib/utils/helpers.js";
import StudyTask from "../models/studyTask.model.js";

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

export const endStudySession = async (req, res) => {
  try {
    const userId = req.user._id;
    const { duration, taskId } = req.body;

    if (!duration) {
      return res.status(400).json({ error: "Duration is required" });
    }

    // Create study session record
    await StudySession.create({
      user: userId,
      duration,
      task: taskId,
      date: new Date(),
    });

    const user = await User.findById(userId);
    const today = new Date();

    // Helper function to get YYYY-MM-DD string from a Date object
    const getDateString = (date) => date.toISOString().split("T")[0];

    // --- Monthly Stats Reset Logic ---
    const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM
    if (user.monthlyStats.lastResetMonth !== currentMonth) {
      user.monthlyStats = {
        studyDuration: 0,
        sessionsCompleted: 0,
        xpEarned: 0,
        lastResetMonth: currentMonth,
      };
      // Also reset monthly streak if the month has changed
      user.monthlyStudyStreak = 0;
      user.lastMonthlyStudyDate = null;
    }

    // --- Update Total and Monthly Stats ---
    user.totalStudyDuration += duration;
    user.totalSessionsCompleted += 1;
    user.monthlyStats.studyDuration += duration;
    user.monthlyStats.sessionsCompleted += 1;

    // --- Refactored Streak Calculation Logic ---
    const todayString = getDateString(today);

    const updateStreak = (lastStudyDate, currentStreak) => {
      const lastStudyString = lastStudyDate
        ? getDateString(new Date(lastStudyDate))
        : null;

      // If already studied today, streak doesn't change
      if (lastStudyString === todayString) {
        return { streak: currentStreak, turnOffVacation: false };
      }

      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayString = getDateString(yesterday);

      let newStreak = currentStreak;
      let turnOffVacation = false;

      if (lastStudyString === yesterdayString || !lastStudyString) {
        newStreak += 1;
      } else {
        if (user.isVacationMode) {
          newStreak += 1;
          turnOffVacation = true;
        } else {
          newStreak = 1;
        }
      }
      return { streak: newStreak, turnOffVacation };
    };

    // --- Apply Streak Logic ---
    const totalStreakResult = updateStreak(user.lastStudyDate, user.studyStreak);
    user.studyStreak = totalStreakResult.streak;

    const monthlyStreakResult = updateStreak(
      user.lastMonthlyStudyDate,
      user.monthlyStudyStreak
    );
    user.monthlyStudyStreak = monthlyStreakResult.streak;

    if (totalStreakResult.turnOffVacation || monthlyStreakResult.turnOffVacation) {
      user.isVacationMode = false;
    }

    // Update last study dates
    user.lastStudyDate = today;
    user.lastMonthlyStudyDate = today;

    // --- Update Longest Streak ---
    if (user.studyStreak > user.longestStudyStreak) {
      user.longestStudyStreak = user.studyStreak;
    }

    await user.save();

    // --- Handle XP, Badges, and Response ---
    const xpResult = await handleXPAndLeveling(user, duration);
    if (xpResult && xpResult.xpEarned) {
      user.monthlyStats.xpEarned += xpResult.xpEarned;
      await user.save();
    }
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

export const createStudyTask = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user._id;

    if (!name) {
      return res.status(400).json({ error: "Task name is required" });
    }

    // Prevent duplicate task names for the same user
    const existingTask = await StudyTask.findOne({ user: userId, name });
    if (existingTask) {
      return res.status(400).json({ error: "A task with this name already exists" });
    }

    const newTask = new StudyTask({ user: userId, name });
    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) {
    console.error("Error in createStudyTask:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserStudyTasks = async (req, res) => {
  try {
    const userId = req.user._id;
    const tasks = await StudyTask.find({ user: userId }).sort({ createdAt: -1 });
    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error in getUserStudyTasks:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteStudyTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const task = await StudyTask.findOne({ _id: id, user: userId });

    if (!task) {
      return res.status(404).json({ error: "Task not found or user not authorized" });
    }

    await StudyTask.findByIdAndDelete(id);
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error in deleteStudyTask:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// --- REAL-TIME DURATION UPDATE ---
export const logStudyTime = async (req, res) => {
  try {
    const userId = req.user._id;
    const { taskId, secondsToAdd } = req.body;

    if (!taskId || !secondsToAdd) {
      return res.status(400).json({ error: "taskId and secondsToAdd are required" });
    }

    // Use Promise.all to run database updates concurrently for better performance
    const [taskUpdateResult, userUpdateResult] = await Promise.all([
      StudyTask.updateOne(
        { _id: taskId, user: userId },
        { $inc: { totalDuration: secondsToAdd } }
      ),
      User.updateOne(
        { _id: userId },
        {
          $inc: {
            totalStudyDuration: secondsToAdd,
            "monthlyStats.studyDuration": secondsToAdd,
          },
        }
      ),
    ]);

    if (taskUpdateResult.nModified === 0) {
      return res.status(404).json({ error: "Task not found or unauthorized" });
    }

    res.status(200).json({ message: "Time logged successfully" });
  } catch (error) {
    console.error("Error in logStudyTime:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getStudyHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const allSessions = await StudySession.find({ user: userId })
      .sort({ date: 1 })
      .select("duration date");

    res.status(200).json(allSessions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch study history" });
  }
};
