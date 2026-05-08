import { create } from "zustand"
import { immer } from "zustand/middleware/immer"

const STORAGE_KEYS = {
  ACTIVE: "pomodoro_is_active",
  START_TIMESTAMP: "pomodoro_start_timestamp",
  DURATION_AT_START: "pomodoro_duration_at_start",
  PAUSED_TIME: "pomodoro_paused_time",
  BREAK: "pomodoro_is_break",
  SESSION_COUNT: "pomodoro_session_count",
  GOAL_REACHED: "pomodoro_goal_reached",
  SELECTED_TASK: "pomodoro_selected_task",
  COMMITTED_DURATION: "pomodoro_committed_duration",
}

const readStorage = (key) => {
  if (typeof localStorage === "undefined") return null
  return localStorage.getItem(key)
}

const writeStorage = (key, value) => {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(key, String(value))
}

const removeStorage = (key) => {
  if (typeof localStorage === "undefined") return
  localStorage.removeItem(key)
}

export const usePomodoroTimerStore = create(
  immer((set) => ({
    timer: 0,
    isActive: false,
    isBreak: false,
    sessionCount: 0,
    isGoalReached: false,
    isInitialized: false,
    selectedTaskId: readStorage(STORAGE_KEYS.SELECTED_TASK) || "",
    engineActions: null,

    setTimer: (value) => set({ timer: value }),
    setIsActive: (value) => set({ isActive: value }),
    setIsBreak: (value) => set({ isBreak: value }),
    setSessionCount: (value) => set({ sessionCount: value }),
    setIsGoalReached: (value) => set({ isGoalReached: value }),
    setIsInitialized: (value) => set({ isInitialized: value }),
    setEngineActions: (actions) => set({ engineActions: actions }),

    setSelectedTaskId: (id) => {
      const nextId = id || ""
      set({ selectedTaskId: nextId })
      if (nextId) writeStorage(STORAGE_KEYS.SELECTED_TASK, nextId)
      else removeStorage(STORAGE_KEYS.SELECTED_TASK)
    },

    persistStart: (
      startTime,
      duration,
      isBreak,
      sessionCount,
      selectedTaskId,
      sessionDurationMinutes,
    ) => {
      writeStorage(STORAGE_KEYS.ACTIVE, "true")
      writeStorage(STORAGE_KEYS.START_TIMESTAMP, startTime)
      writeStorage(STORAGE_KEYS.DURATION_AT_START, duration)
      writeStorage(STORAGE_KEYS.BREAK, isBreak)
      writeStorage(STORAGE_KEYS.SESSION_COUNT, sessionCount)
      writeStorage(STORAGE_KEYS.GOAL_REACHED, "false")
      removeStorage(STORAGE_KEYS.PAUSED_TIME)

      if (!isBreak && sessionDurationMinutes != null) {
        writeStorage(STORAGE_KEYS.COMMITTED_DURATION, Math.round(sessionDurationMinutes))
      }

      if (selectedTaskId) writeStorage(STORAGE_KEYS.SELECTED_TASK, selectedTaskId)
      else removeStorage(STORAGE_KEYS.SELECTED_TASK)
    },

    persistPause: (timer) => {
      writeStorage(STORAGE_KEYS.ACTIVE, "false")
      writeStorage(STORAGE_KEYS.PAUSED_TIME, timer)
      removeStorage(STORAGE_KEYS.START_TIMESTAMP)
      removeStorage(STORAGE_KEYS.DURATION_AT_START)
    },

    persistReset: () => {
      Object.values(STORAGE_KEYS).forEach((key) => removeStorage(key))
    },

    persistGoalReached: (sessionCount) => {
      writeStorage(STORAGE_KEYS.ACTIVE, "false")
      writeStorage(STORAGE_KEYS.GOAL_REACHED, "true")
      writeStorage(STORAGE_KEYS.SESSION_COUNT, sessionCount)
      removeStorage(STORAGE_KEYS.START_TIMESTAMP)
      removeStorage(STORAGE_KEYS.DURATION_AT_START)
      removeStorage(STORAGE_KEYS.PAUSED_TIME)
    },

    persistNextPhase: (isBreak, sessionCount, duration, autoplay, startTime) => {
      writeStorage(STORAGE_KEYS.BREAK, isBreak)
      writeStorage(STORAGE_KEYS.SESSION_COUNT, sessionCount)
      writeStorage(STORAGE_KEYS.GOAL_REACHED, "false")

      if (autoplay && startTime) {
        writeStorage(STORAGE_KEYS.ACTIVE, "true")
        writeStorage(STORAGE_KEYS.START_TIMESTAMP, startTime)
        writeStorage(STORAGE_KEYS.DURATION_AT_START, duration)
        removeStorage(STORAGE_KEYS.PAUSED_TIME)
      } else {
        writeStorage(STORAGE_KEYS.ACTIVE, "false")
        writeStorage(STORAGE_KEYS.PAUSED_TIME, duration)
        removeStorage(STORAGE_KEYS.START_TIMESTAMP)
        removeStorage(STORAGE_KEYS.DURATION_AT_START)
      }
    },
  })),
)

export { STORAGE_KEYS }
