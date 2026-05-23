import { create } from "zustand"

// Tracks which preview URL is currently autoplaying.
// Setting a new URL implicitly stops all others (there's only one slot).
export const useVideoPreviewStore = create((set) => ({
  activeUrl: null,
  setActiveUrl: (url) => set({ activeUrl: url }),
  clearActiveUrl: () => set({ activeUrl: null }),
}))
