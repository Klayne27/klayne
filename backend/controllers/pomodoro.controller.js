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
const broadcastSessionStart = async (userId, activeSession) => {
  const userDoc = await User.findById(userId)
    .select("isPomodoroPrivate username fullName profileImg nameColor equipped")
    .populate("profileImg", "imageUrl")
    .lean();

  if (!userDoc || userDoc.isPomodoroPrivate) return;

  io.to("live_pomodoro").emit("live_session_started", {
    userId: userId.toString(),
    username: userDoc.username,
    fullName: userDoc.fullName,
    profileImg: userDoc.profileImg,
    nameColor: userDoc.nameColor,
    equipped: userDoc.equipped,
    expectedEndTime: activeSession.scheduledEndTime.getTime(),
    startTime: activeSession.startTime.getTime(),
    sessionCount: activeSession.sessionCount,
  });
};

/**
 * Emits live_session_stopped and clears the denormalized User.activeSession field.
 * Called from endSession, cancelSession, and pauseSession.
 */
const broadcastSessionStop = async (userId) => {
  io.to("live_pomodoro").emit("live_session_stopped", { userId: userId.toString() });

  await User.findByIdAndUpdate(userId, {
    $set: {
      "activeSession.isActive": false,
      "activeSession.type": null,
      "activeSession.startTime": null,
      "activeSession.expectedEndTime": null,
      "activeSession.sessionCount": 0,
    },
  });
};

// ── POST /api/study/session/start ─────────────────────────────────────────────
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

    // Breaks are tracked client-only — no server record needed
    if (isBreak) {
      return res.status(400).json({ error: "Break sessions are client-only." });
    }

    const existing = await ActiveSession.findOne({ user: userId });
    if (existing) {
      const now = new Date();

      if (existing.isPaused) {
        // Resume a paused session
        const storedRemaining = Number(existing.pausedRemainingSeconds);
        const fallback =
          Number.isFinite(numericDurationSeconds) && numericDurationSeconds > 0
            ? numericDurationSeconds
            : plannedDurationSeconds;
        const remainingSeconds = Math.min(
          plannedDurationSeconds,
          Math.max(0, Number.isFinite(storedRemaining) ? storedRemaining : fallback),
        );

        if (!Number.isFinite(Number(existing.plannedDuration)) || remainingSeconds <= 0) {
          await ActiveSession.deleteOne({ user: userId });
          // fall through to create new session below
        } else {
          const elapsed = Number(existing.plannedDuration) * 60 - remainingSeconds;
          existing.startTime = new Date(now.getTime() - elapsed * 1000);
          existing.scheduledEndTime = new Date(now.getTime() + remainingSeconds * 1000);
          existing.isPaused = false;
          existing.pausedRemainingSeconds = null;
          existing.pausedAt = null;
          existing.lastHeartbeat = now;
          if (!existing.taskId && taskId) existing.taskId = taskId;
          await existing.save();

          // Update denormalized field
          await User.findByIdAndUpdate(userId, {
            $set: {
              "activeSession.isActive": true,
              "activeSession.type": "work",
              "activeSession.startTime": existing.startTime,
              "activeSession.expectedEndTime": existing.scheduledEndTime,
              "activeSession.sessionCount": existing.sessionCount,
            },
          });

          const serialized = serializeActiveSession(existing, now);
          emitToUser(userId, "pomodoroSessionStarted", { activeSession: serialized });

          // Re-broadcast to live dashboard since resume = active again
          await broadcastSessionStart(userId, existing);

          return res.status(200).json(serialized);
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

    // Create a new session
    const activeDurationSeconds =
      Number.isFinite(numericDurationSeconds) && numericDurationSeconds > 0
        ? Math.min(numericDurationSeconds, plannedDurationSeconds)
        : plannedDurationSeconds;

    const now = new Date();
    const elapsed = plannedDurationSeconds - activeDurationSeconds;
    const startTime = new Date(now.getTime() - elapsed * 1000);
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

    // Update denormalized User.activeSession
    await User.findByIdAndUpdate(userId, {
      $set: {
        "activeSession.isActive": true,
        "activeSession.type": "work",
        "activeSession.startTime": startTime,
        "activeSession.expectedEndTime": scheduledEndTime,
        "activeSession.sessionCount": sessionCount,
      },
    });

    const serialized = serializeActiveSession(activeSession, now);

    // Notify the user's other devices
    emitToUser(userId, "pomodoroSessionStarted", { activeSession: serialized });

    // Broadcast to the live dashboard room
    await broadcastSessionStart(userId, activeSession);

    return res.status(201).json(serialized);
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

// ── GET /api/study/session/active ─────────────────────────────────────────────
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

// ── POST /api/study/session/end ───────────────────────────────────────────────
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
      return res.status(400).json({
        error: "Session not complete yet.",
        remainingSeconds: Math.max(
          0,
          Math.ceil((activeSession.scheduledEndTime - now) / 1000),
        ),
      });
    }

    // findOneAndDelete is atomic — prevents double-submission
    const deleted = await ActiveSession.findOneAndDelete({
      _id: activeSession._id,
      user: userId,
    });
    if (!deleted) {
      return res.status(404).json({ error: "No active session found." });
    }

    // Remove from live dashboard and clear denormalized field
    await broadcastSessionStop(userId);

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

    // Notify all the user's devices that the session is complete
    emitToUser(userId, "pomodoroSessionCompleted", { result, validatedDuration });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in endSession:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── PATCH /api/study/session/pause ────────────────────────────────────────────
export const pauseSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const session = await ActiveSession.findOne({ user: userId });

    if (!session) {
      return res.status(404).json({ error: "No active session found." });
    }

    const now = new Date();
    const plannedDurationSeconds = Number(session.plannedDuration) * 60;
    const serverRemainingSeconds = session.isPaused
      ? Number(session.pausedRemainingSeconds)
      : (session.scheduledEndTime.getTime() - now.getTime()) / 1000;
    const requestedRemaining = Number(req.body?.remainingSeconds);
    const rawRemaining =
      Number.isFinite(serverRemainingSeconds) && serverRemainingSeconds > 0
        ? serverRemainingSeconds
        : requestedRemaining;
    const remainingSeconds = Math.min(
      plannedDurationSeconds,
      Math.max(0, Number.isFinite(rawRemaining) ? rawRemaining : 0),
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
    // Extend TTL so the paused session survives for up to 7 days
    session.scheduledEndTime = new Date(now.getTime() + PAUSED_SESSION_RETENTION_MS);
    await session.save();

    // Paused = no longer "live" on the dashboard
    // (the user isn't actively studying — remove them from the live view)
    await broadcastSessionStop(userId);

    const serialized = serializeActiveSession(session, now);
    emitToUser(userId, "pomodoroSessionPaused", { activeSession: serialized });

    return res.status(200).json(serialized);
  } catch (error) {
    console.error("Error in pauseSession:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── DELETE /api/study/session/active ─────────────────────────────────────────
export const cancelSession = async (req, res) => {
  try {
    const userId = req.user._id; // ← was missing: referenced undefined `userId`

    const result = await ActiveSession.deleteOne({ user: userId });
    if (result.deletedCount === 0) {
      // 404 is acceptable — session may have already expired via TTL
      return res.status(404).json({ error: "No active session found." });
    }

    // Remove from live dashboard and clear denormalized field
    await broadcastSessionStop(userId);

    return res.status(200).json({ message: "Session cancelled." });
  } catch (error) {
    console.error("Error in cancelSession:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ── POST /api/study/session/heartbeat ────────────────────────────────────────
export const sessionHeartbeat = async (req, res) => {
  try {
    const now = new Date();
    const session = await ActiveSession.findOne({ user: req.user._id });
    if (!session) return res.status(404).json({ error: "No active session." });

    // FIX: removed the scheduledEndTime extension block entirely.
    //
    // The original code extended scheduledEndTime by (plannedDuration + 5) minutes
    // from *now* whenever < 3 minutes remained. This had two bugs:
    //
    //   1. The extended scheduledEndTime was then emitted to the live dashboard
    //      via updatePrivacySettings, showing viewers ~9 min when 1 min was left.
    //
    //   2. The heartbeat response itself returned remainingMs from the extended
    //      scheduledEndTime, causing the client timer to flash a wrong value
    //      for one tick before the worker corrected it.
    //
    // The TTL concern (MongoDB deleting the record before endSession fires) is
    // already handled by expireAfterSeconds: 300 on the TTL index — the record
    // survives 5 minutes past scheduledEndTime, which is more than enough.
    // No extension needed.

    session.lastHeartbeat = now;
    await session.save();

    if (session.isPaused) {
      const remainingSeconds = Math.max(0, Number(session.pausedRemainingSeconds) || 0);
      return res.status(200).json({
        remainingMs: remainingSeconds * 1000,
        remainingSeconds,
        isPaused: true,
      });
    }

    // Return remaining based on the original, unmodified scheduledEndTime
    const remainingMs = Math.max(0, session.scheduledEndTime.getTime() - now.getTime());
    return res.status(200).json({
      remainingMs,
      remainingSeconds: Math.ceil(remainingMs / 1000),
    });
  } catch (error) {
    console.error("Error in sessionHeartbeat:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
 
// ── GET /api/study/sessions/live ─────────────────────────────────────────────
export const getLiveSessions = async (req, res) => {
  try {
    const now = new Date();
    const sessions = await ActiveSession.find({
      isBreak: false,
      isPaused: { $ne: true },
      scheduledEndTime: { $gt: now },
    }).populate({
      path: "user",
      // FIX: explicitly select ONLY the fields needed for the live card.
      // Previously the full schema was leaking because socket emissions were
      // sending the raw populated doc. This explicit projection prevents that
      // at the DB level — nothing extra can slip through even via socket.
      select:
        "username fullName profileImg isPomodoroPrivate nameColor equipped pomodoroLevel pomodoroXP totalStudyDuration totalSessionsCompleted",
      populate: { path: "profileImg", select: "imageUrl" },
    });

    const publicSessions = sessions
      .filter((s) => s.user && !s.user.isPomodoroPrivate)
      .map((s) => ({
        userId: s.user._id.toString(),
        username: s.user.username,
        fullName: s.user.fullName,
        profileImg: s.user.profileImg,
        nameColor: s.user.nameColor,
        equipped: s.user.equipped,
        expectedEndTime: s.scheduledEndTime.getTime(),
        startTime: s.startTime.getTime(),
        sessionCount: s.sessionCount,
        // Stats — shown on the live card
        pomodoroLevel: s.user.pomodoroLevel ?? 0,
        totalStudyDuration: s.user.totalStudyDuration ?? 0,
        totalSessionsCompleted: s.user.totalSessionsCompleted ?? 0,
      }));

    return res.status(200).json(publicSessions);
  } catch (error) {
    console.error("Error in getLiveSessions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
 
// GET /api/study/server-time
export const getServerTime = (_req, res) => {
  res.status(200).json({ serverTime: Date.now() });
};