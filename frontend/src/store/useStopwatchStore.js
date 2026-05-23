import { create } from "zustand"
import { persist } from "zustand/middleware"

export const useStopwatchStore = create(
  persist(
    (set, get) => ({
      isRunning: false,
      startTime: null, // Date.now() when last started/resumed
      accumulatedMs: 0, // ms before the current running segment
      lapStartMs: 0, // total ms when current lap began
      laps: [], // [{ index, lapMs, totalMs }]

      start: () => {
        if (get().isRunning) return
        set({ isRunning: true, startTime: Date.now() })
      },

      pause: () => {
        if (!get().isRunning) return
        const { startTime, accumulatedMs } = get()
        set({
          isRunning: false,
          accumulatedMs: accumulatedMs + (Date.now() - startTime),
          startTime: null,
        })
      },

      lap: () => {
        const { isRunning, startTime, accumulatedMs, lapStartMs, laps } = get()
        if (!isRunning) return
        const totalMs = accumulatedMs + (Date.now() - startTime)
        const lapMs = totalMs - lapStartMs
        set({
          lapStartMs: totalMs,
          laps: [...laps, { index: laps.length + 1, lapMs, totalMs }],
        })
      },

      reset: () =>
        set({ isRunning: false, startTime: null, accumulatedMs: 0, lapStartMs: 0, laps: [] }),
    }),
    { name: "klayne-stopwatch" },
  ),
)
