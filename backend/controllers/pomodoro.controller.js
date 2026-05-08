import ActiveSession from "../models/activeSession.model.js";
import StudySession from "../models/studySession.js";
import User from "../models/user.model.js";
import { io, getReceiverSocketIds } from "../lib/socket.js";
import { checkAndAwardBadges, handleXPAndLeveling } from "../lib/utils/helpers.js";
import { checkUnlocks } from "../lib/utils/checkUnlocks.js";

const PAUSED_SESSION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export async function processStudySession({ userId, duration, taskId }) {
  await StudySession.create({
    user: userId,
    duration,
    task: taskId ?? null,
    date: new Date(),
  });

  const user = await User.findById(userId);
  const today = new Date();
  const getDateString = (d) => d.toISOString().split("T")[0];
  const todayString = getDateString(today);

  const histIdx = user.studyHistory.findIndex((e) => e.date === todayString);
  if (histIdx !== -1) {
    user.studyHistory[histIdx].count += 1;
    user.studyHistory[histIdx].duration += duration;
  } else {
    user.studyHistory.push({ date: todayString, count: 1, duration });
    if (user.studyHistory.length > 365) user.studyHistory.shift();
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
    const lastStudyString = lastStudyDate ? getDateString(new Date(lastStudyDate)) : null;
    if (lastStudyString === todayString)
      return { streak: currentStreak, resetVacation: false };
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
  if (user.studyStreak > user.longestStudyStreak)
    user.longestStudyStreak = user.studyStreak;

  const xpResult = await handleXPAndLeveling(user, duration);
  if (xpResult?.xpEarned) {
    user.monthlyStats.xpEarned += xpResult.xpEarned;
    user.weeklyStats.xpEarned += xpResult.xpEarned;
  }

  await user.save();
  await checkAndAwardBadges(user);
  const newUnlocks = await checkUnlocks(user);

  return {
    message: "Study session logged successfully",
    xpResult,
    studyHistory: user.studyHistory,
    newUnlocks,
  };
}

const serializeActiveSession = (session, now = new Date()) => {
  if (!session) return null;

  if (session.isPaused) {
    return {
      ...session.toObject(),
      remainingSeconds: Math.max(
        0,
        Number(session.pausedRemainingSeconds ?? session.remainingSeconds) || 0,
      ),
    };
  }

  const scheduledEndTimeMs = session.scheduledEndTime.getTime();
  const remainingSeconds = Math.max(
    0,
    Math.ceil((scheduledEndTimeMs - now.getTime()) / 1000),
  );

  return {
    ...session.toObject(),
    remainingSeconds,
  };
};

const emitToUser = (userId, eventName, payload) => {
  const socketIds = getReceiverSocketIds(userId.toString());
  if (socketIds.length > 0) {
    io.to(socketIds).emit(eventName, payload);
  }
};

export const startSession = async (req, res) => {
  try {
    const {
      plannedDuration,
      durationSeconds,
      isBreak = false,
      sessionCount = 0,
      taskId = null,
    } = req.body;
    const userId = req.user._id;
    const numericPlannedDuration = Number(plannedDuration);
    const plannedDurationSeconds = numericPlannedDuration * 60;
    const numericDurationSeconds = Number(durationSeconds);

    if (!Number.isFinite(numericPlannedDuration) || numericPlannedDuration <= 0) {
      return res
        .status(400)
        .json({ error: "plannedDuration is required and must be positive." });
    }

    if (isBreak) {
      return res.status(400).json({ error: "Break sessions are client-only." });
    }

    const existing = await ActiveSession.findOne({ user: userId });
    if (existing) {
      const now = new Date();

      if (existing.isPaused) {
        const existingPlannedDuration = Number(existing.plannedDuration);
        const existingPlannedDurationSeconds = existingPlannedDuration * 60;
        const storedRemainingSeconds = Number(existing.pausedRemainingSeconds);
        const fallbackRemainingSeconds =
          Number.isFinite(numericDurationSeconds) && numericDurationSeconds > 0
            ? numericDurationSeconds
            : existingPlannedDurationSeconds;
        const remainingSeconds = Math.min(
          existingPlannedDurationSeconds,
          Math.max(
            0,
            Number.isFinite(storedRemainingSeconds)
              ? storedRemainingSeconds
              : fallbackRemainingSeconds,
          ),
        );

        if (
          !Number.isFinite(existingPlannedDuration) ||
          existingPlannedDuration <= 0 ||
          remainingSeconds <= 0
        ) {
          await ActiveSession.deleteOne({ user: userId });
        } else {
          const elapsedBeforePauseSeconds = Math.max(
            0,
            existingPlannedDurationSeconds - remainingSeconds,
          );
          existing.startTime = new Date(
            now.getTime() - elapsedBeforePauseSeconds * 1000,
          );
          existing.scheduledEndTime = new Date(
            now.getTime() + remainingSeconds * 1000,
          );
          existing.isPaused = false;
          existing.pausedRemainingSeconds = null;
          existing.pausedAt = null;
          existing.lastHeartbeat = now;
          if (!existing.taskId && taskId) existing.taskId = taskId;

          await existing.save();

          const serializedSession = serializeActiveSession(existing, now);
          emitToUser(userId, "pomodoroSessionStarted", {
            activeSession: serializedSession,
          });

          return res.status(200).json(serializedSession);
        }
      }

      if (!existing.isPaused && now < existing.scheduledEndTime) {
        return res.status(409).json({
          error: "An active session is already running.",
          activeSession: serializeActiveSession(existing, now),
        });
      }

      await ActiveSession.deleteOne({ user: userId });
    }

    const activeDurationSeconds =
      Number.isFinite(numericDurationSeconds) && numericDurationSeconds > 0
        ? Math.min(numericDurationSeconds, plannedDurationSeconds)
        : plannedDurationSeconds;
    const now = new Date();
    const elapsedBeforeStartSeconds = Math.max(
      0,
      plannedDurationSeconds - activeDurationSeconds,
    );
    const startTime = new Date(now.getTime() - elapsedBeforeStartSeconds * 1000);
    const scheduledEndTime = new Date(
      startTime.getTime() + plannedDurationSeconds * 1000,
    );

    const activeSession = await ActiveSession.create({
      user: userId,
      startTime,
      plannedDuration: numericPlannedDuration,
      scheduledEndTime,
      isBreak: false,
      sessionCount,
      taskId: taskId || null,
    });

    const serializedSession = serializeActiveSession(activeSession, now);
    emitToUser(userId, "pomodoroSessionStarted", {
      activeSession: serializedSession,
    });

    res.status(201).json(serializedSession);
  } catch (error) {
    if (error.code === 11000) {
      const existing = await ActiveSession.findOne({ user: req.user._id });
      const now = new Date();
      return res.status(409).json({
        error: "An active session is already running.",
        activeSession: serializeActiveSession(existing, now),
      });
    }

    console.error("Error in startSession:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getActiveSession = async (req, res) => {
  try {
    const session = await ActiveSession.findOne({ user: req.user._id });
    if (!session) return res.status(200).json(null);

    res.status(200).json(serializeActiveSession(session));
  } catch (error) {
    console.error("Error in getActiveSession:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const endSession = async (req, res) => {
  try {
    const { taskId } = req.body;
    const userId = req.user._id;

    const activeSession = await ActiveSession.findOne({ user: userId });
    if (!activeSession) {
      return res.status(404).json({ error: "No active session found." });
    }

    const now = new Date();
    if (activeSession.isPaused) {
      return res.status(400).json({
        error: "Session is paused.",
        activeSession: serializeActiveSession(activeSession, now),
      });
    }

    const elapsedMs = now - activeSession.startTime;
    const elapsedMinutes = elapsedMs / 1000 / 60;
    const TOLERANCE_SECONDS = 15;

    if (elapsedMinutes < activeSession.plannedDuration - TOLERANCE_SECONDS / 60) {
      const remainingSeconds = Math.ceil((activeSession.scheduledEndTime - now) / 1000);
      return res.status(400).json({
        error: "Session not complete yet.",
        remainingSeconds: Math.max(0, remainingSeconds),
      });
    }

    const deletedSession = await ActiveSession.findOneAndDelete({
      _id: activeSession._id,
      user: userId,
    });

    if (!deletedSession) {
      return res.status(404).json({ error: "No active session found." });
    }

    if (activeSession.isBreak) {
      emitToUser(userId, "pomodoroBreakEnded", {});
      return res.status(200).json({ message: "Break ended.", isBreak: true });
    }

    const validatedDuration = Math.min(
      activeSession.plannedDuration,
      Math.ceil(elapsedMinutes),
    );

    const result = await processStudySession({
      userId,
      duration: validatedDuration,
      taskId: taskId || activeSession.taskId,
    });

    emitToUser(userId, "pomodoroSessionCompleted", { result, validatedDuration });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in endSession:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const pauseSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const session = await ActiveSession.findOne({ user: userId });

    if (!session) {
      return res.status(404).json({ error: "No active session found." });
    }

    const now = new Date();
    const plannedDurationSeconds = Number(session.plannedDuration) * 60;
    const requestedRemainingSeconds = Number(req.body?.remainingSeconds);
    const serverRemainingSeconds = session.isPaused
      ? Number(session.pausedRemainingSeconds)
      : (session.scheduledEndTime.getTime() - now.getTime()) / 1000;
    const rawRemainingSeconds =
      Number.isFinite(serverRemainingSeconds) && serverRemainingSeconds > 0
        ? serverRemainingSeconds
        : requestedRemainingSeconds;
    const remainingSeconds = Math.min(
      plannedDurationSeconds,
      Math.max(
        0,
        Number.isFinite(rawRemainingSeconds) ? rawRemainingSeconds : 0,
      ),
    );

    if (!Number.isFinite(plannedDurationSeconds) || plannedDurationSeconds <= 0) {
      await ActiveSession.deleteOne({ user: userId });
      return res.status(404).json({ error: "No active session found." });
    }

    if (remainingSeconds <= 0) {
      return res.status(400).json({
        error: "Session is already complete.",
        activeSession: serializeActiveSession(session, now),
      });
    }

    session.isPaused = true;
    session.pausedRemainingSeconds = remainingSeconds;
    session.pausedAt = now;
    session.lastHeartbeat = now;
    // Keep paused sessions alive long enough to resume from another device.
    session.scheduledEndTime = new Date(now.getTime() + PAUSED_SESSION_RETENTION_MS);

    await session.save();

    const serializedSession = serializeActiveSession(session, now);
    emitToUser(userId, "pomodoroSessionPaused", {
      activeSession: serializedSession,
    });

    res.status(200).json(serializedSession);
  } catch (error) {
    console.error("Error in pauseSession:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const cancelSession = async (req, res) => {
  try {
    const result = await ActiveSession.deleteOne({ user: req.user._id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "No active session found." });
    }

    res.status(200).json({ message: "Session cancelled." });
  } catch (error) {
    console.error("Error in cancelSession:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sessionHeartbeat = async (req, res) => {
  try {
    const session = await ActiveSession.findOneAndUpdate(
      { user: req.user._id },
      { lastHeartbeat: new Date() },
      { new: true },
    );
    if (!session) return res.status(404).json({ error: "No active session." });

    if (session.isPaused) {
      const remainingSeconds = Math.max(
        0,
        Number(session.pausedRemainingSeconds) || 0,
      );
      return res.status(200).json({
        remainingMs: remainingSeconds * 1000,
        remainingSeconds,
        isPaused: true,
      });
    }

    const remainingMs = Math.max(0, session.scheduledEndTime - new Date());
    res
      .status(200)
      .json({ remainingMs, remainingSeconds: Math.ceil(remainingMs / 1000) });
  } catch (error) {
    console.error("Error in sessionHeartbeat:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
