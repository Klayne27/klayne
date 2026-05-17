// src/store/usePomodoroBackgroundStore.js
import { create } from "zustand"
import { persist } from "zustand/middleware"
import { preloadActiveBackground } from "../utils/backgroundPreloader"

export const usePomodoroBackgroundStore = create(
  persist(
    (set) => ({
      presetKey: null,
      customImageUrl: null,
      customPublicId: null,

      setPreset: (key) => set({ presetKey: key, customImageUrl: null, customPublicId: null }),

      setCustom: ({ url, publicId }) =>
        set({ presetKey: null, customImageUrl: url, customPublicId: publicId }),

      clearBackground: () => set({ presetKey: null, customImageUrl: null, customPublicId: null }),
    }),
    {
      name: "pomodoro-background",

      // Called once, synchronously, after localStorage is rehydrated.
      // At this point we know which background the user had last session,
      // so we kick off a low-priority fetch immediately — before the
      // Pomodoro page even mounts.
      onRehydrateStorage: () => (state) => {
        if (state) {
          preloadActiveBackground(state.presetKey, state.customImageUrl)
        }
      },
    },
  ),
)
