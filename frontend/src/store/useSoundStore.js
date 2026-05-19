import { create } from "zustand"

const SOUND_MUTED_KEY = "pomodoro_sound_muted"

export const useSoundStore = create((set) => ({
  soundMuted: localStorage.getItem(SOUND_MUTED_KEY) === "true",

  toggleSoundMuted: () =>
    set((state) => {
      const next = !state.soundMuted
      localStorage.setItem(SOUND_MUTED_KEY, String(next))
      return { soundMuted: next }
    }),
}))
