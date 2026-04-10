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

export const usePomodoroTimerStore = create(
  immer((set, get) => ({
    // ── Timer display state ────────────────────────────────────────────────
    timer: 0,
    isActive: false,
    isBreak: false,
    sessionCount: 0,
    isGoalReached: false,
    selectedTaskId: localStorage.getItem(STORAGE_KEYS.SELECTED_TASK) || "",

    // Add to your store's state/actions:
    engineActions: {
      startNextTimer: null,
      handleSessionEnd: null,
      startTimestampRef: null,
      durationAtStartRef: null,
    },

    // ── UI flags ───────────────────────────────────────────────────────────
    isInitialized: false, // true after first hydration from localStorage

    // ── Setters ────────────────────────────────────────────────────────────
    setEngineActions: (actions) => set({ engineActions: actions }),
    setTimer: (value) => set({ timer: value }),
    setIsActive: (value) => set({ isActive: value }),
    setIsBreak: (value) => set({ isBreak: value }),
    setSessionCount: (value) => set({ sessionCount: value }),
    setIsGoalReached: (value) => set({ isGoalReached: value }),
    setIsInitialized: (value) => set({ isInitialized: value }),
    setSelectedTaskId: (id) => {
      set({ selectedTaskId: id })
      if (id) localStorage.setItem(STORAGE_KEYS.SELECTED_TASK, id)
      else localStorage.removeItem(STORAGE_KEYS.SELECTED_TASK)
    },

    // ── Persist active state to localStorage ──────────────────────────────
    persistStart: (startTime, duration, isBreak, sessionCount, selectedTaskId) => {
      localStorage.setItem(STORAGE_KEYS.ACTIVE, "true")
      localStorage.setItem(STORAGE_KEYS.START_TIMESTAMP, startTime)
      localStorage.setItem(STORAGE_KEYS.DURATION_AT_START, duration)
      localStorage.setItem(STORAGE_KEYS.BREAK, isBreak)
      localStorage.setItem(STORAGE_KEYS.SESSION_COUNT, sessionCount)
      localStorage.removeItem(STORAGE_KEYS.PAUSED_TIME)
      localStorage.setItem(STORAGE_KEYS.GOAL_REACHED, "false")
      if (!isBreak) {
        const durationMinutes = duration / 60
        localStorage.setItem(STORAGE_KEYS.COMMITTED_DURATION, durationMinutes)
      }
      if (selectedTaskId) localStorage.setItem(STORAGE_KEYS.SELECTED_TASK, selectedTaskId)
    },

    persistPause: (timer) => {
      localStorage.setItem(STORAGE_KEYS.PAUSED_TIME, timer)
      localStorage.setItem(STORAGE_KEYS.ACTIVE, "false")
      localStorage.removeItem(STORAGE_KEYS.START_TIMESTAMP)
      localStorage.removeItem(STORAGE_KEYS.DURATION_AT_START)
    },

    persistReset: () => {
      Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key))
    },

    persistNextPhase: (isBreak, sessionCount, duration, autoplay, startTime) => {
      localStorage.setItem(STORAGE_KEYS.BREAK, isBreak)
      localStorage.setItem(STORAGE_KEYS.SESSION_COUNT, sessionCount)
      localStorage.setItem(STORAGE_KEYS.GOAL_REACHED, "false")
      if (autoplay && startTime) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE, "true")
        localStorage.setItem(STORAGE_KEYS.START_TIMESTAMP, startTime)
        localStorage.setItem(STORAGE_KEYS.DURATION_AT_START, duration)
        localStorage.removeItem(STORAGE_KEYS.PAUSED_TIME)
      } else {
        localStorage.setItem(STORAGE_KEYS.PAUSED_TIME, duration)
        localStorage.setItem(STORAGE_KEYS.ACTIVE, "false")
        localStorage.removeItem(STORAGE_KEYS.START_TIMESTAMP)
        localStorage.removeItem(STORAGE_KEYS.DURATION_AT_START)
      }
    },
  })),
)

export { STORAGE_KEYS }
