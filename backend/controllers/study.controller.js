import User from "../models/user.model.js";
import StudySession from "../models/studySession.js";
import { checkAndAwardBadges, handleXPAndLeveling } from "../lib/utils/helpers.js";
import StudyTask from "../models/studyTask.model.js";

export const getStudyActivityFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const combinedPipeline = [
      {
        $unionWith: {
          coll: "levelups", 
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: "users",
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

    await StudySession.create({
      user: userId,
      duration,
      task: taskId,
      date: new Date(),
    });

    const user = await User.findById(userId);
    const today = new Date();

    // Helper for YYYY-MM-DD
    const getDateString = (date) => date.toISOString().split("T")[0];
    const todayString = getDateString(today);

    // --- NEW: HEATMAP LOGIC ---
    const historyIndex = user.studyHistory.findIndex(
      (entry) => entry.date === todayString,
    );

    if (historyIndex !== -1) {
      user.studyHistory[historyIndex].count += 1;
      user.studyHistory[historyIndex].duration += duration;
    } else {
      user.studyHistory.push({
        date: todayString,
        count: 1,
        duration: duration,
      });

      if (user.studyHistory.length > 365) {
        user.studyHistory.shift();
      }
    }

    const getMondayOfWeek = (date) => {
      const d = new Date(date);
      const day = d.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setUTCDate(d.getUTCDate() + diff);
      d.setUTCHours(0, 0, 0, 0);
      return d.toISOString().split("T")[0];
    };

    const currentWeekStart = getMondayOfWeek(today);

    if (user.weeklyStats.weekStart !== currentWeekStart) {
      user.weeklyStats = {
        studyDuration: 0,
        sessionsCompleted: 0,
        xpEarned: 0,
        weekStart: currentWeekStart,
      };
    }

    user.weeklyStats.studyDuration += duration;
    user.weeklyStats.sessionsCompleted += 1;

    const currentMonth = today.toISOString().slice(0, 7);
    if (user.monthlyStats.lastResetMonth !== currentMonth) {
      user.monthlyStats = {
        studyDuration: 0,
        sessionsCompleted: 0,
        xpEarned: 0,
        lastResetMonth: currentMonth,
      };
      user.monthlyStudyStreak = 0;
      user.lastMonthlyStudyDate = null;
    }

    user.totalStudyDuration += duration;
    user.totalSessionsCompleted += 1;
    user.monthlyStats.studyDuration += duration;
    user.monthlyStats.sessionsCompleted += 1;

    const updateStreak = (lastStudyDate, currentStreak) => {
      const lastStudyString = lastStudyDate
        ? getDateString(new Date(lastStudyDate))
        : null;

      if (lastStudyString === todayString) {
        return { streak: currentStreak, resetVacation: false };
      }

      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayString = getDateString(yesterday);

      let newStreak = currentStreak;
      let resetVacation = false;

      if (lastStudyString === yesterdayString || !lastStudyString) {
        newStreak += 1;
      } else {
        const lastStudyDay = lastStudyDate ? new Date(lastStudyDate) : null;
        const vacationStarted = user.vacationModeStartDate
          ? new Date(user.vacationModeStartDate)
          : null;

        const dayAfterLastStudy = new Date(lastStudyDay);
        dayAfterLastStudy.setUTCDate(lastStudyDay.getUTCDate() + 1);
        dayAfterLastStudy.setUTCHours(0, 0, 0, 0);

        const isGapExcusedByVacation =
          vacationStarted &&
          lastStudyDay &&
          vacationStarted.getTime() <= dayAfterLastStudy.getTime();

        if (isGapExcusedByVacation) {
          newStreak += 1;
          resetVacation = true;
        } else {
          newStreak = 1;
        }
      }
      return { streak: newStreak, resetVacation };
    };

    const totalStreakResult = updateStreak(user.lastStudyDate, user.studyStreak);
    user.studyStreak = totalStreakResult.streak;

    const monthlyStreakResult = updateStreak(
      user.lastMonthlyStudyDate,
      user.monthlyStudyStreak,
    );
    user.monthlyStudyStreak = monthlyStreakResult.streak;

    if (totalStreakResult.resetVacation || monthlyStreakResult.resetVacation) {
      user.isVacationMode = false;
      user.vacationModeStartDate = null;
    }

    user.lastStudyDate = today;
    user.lastMonthlyStudyDate = today;

    if (user.studyStreak > user.longestStudyStreak) {
      user.longestStudyStreak = user.studyStreak;
    }

    const xpResult = await handleXPAndLeveling(user, duration);
    if (xpResult && xpResult.xpEarned) {
      user.monthlyStats.xpEarned += xpResult.xpEarned;
      user.weeklyStats.xpEarned += xpResult.xpEarned;
    }

    await user.save();
    await checkAndAwardBadges(user);

    res.status(200).json({
      message: "Study session logged successfully",
      xpResult,
      studyHistory: user.studyHistory, 
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
      { new: true },
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

export const logStudyTime = async (req, res) => {
  try {
    const userId = req.user._id;
    const { taskId, secondsToAdd } = req.body;

    if (!taskId || !secondsToAdd) {
      return res.status(400).json({ error: "taskId and secondsToAdd are required" });
    }

    const [taskUpdateResult, userUpdateResult] = await Promise.all([
      StudyTask.updateOne(
        { _id: taskId, user: userId },
        { $inc: { totalDuration: secondsToAdd } },
      ),
      User.updateOne(
        { _id: userId },
        {
          $inc: {
            totalStudyDuration: secondsToAdd,
            "monthlyStats.studyDuration": secondsToAdd,
          },
        },
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
