import { create } from "zustand"
import { persist } from "zustand/middleware"

/**
 * Persisted to localStorage automatically.
 * Shape:
 *   presetKey         – one of the POMODORO_PRESETS keys, or null
 *   customImageUrl    – Cloudinary URL for a user-uploaded image, or null
 *   customPublicId    – Cloudinary public_id for deletion, or null
 *
 * Rule: presetKey and customImageUrl are mutually exclusive.
 * Whichever was set last "wins"; the other is cleared.
 */
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
      name: "pomodoro-background", // localStorage key
    },
  ),
)
