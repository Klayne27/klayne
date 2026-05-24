import { create } from "zustand"

// Tracks which preview URL is currently autoplaying.
// Setting a new URL implicitly stops all others (there's only one slot).
export const useVideoPreviewStore = create((set) => ({
  activeId: null, // instance ID, not URL — prevents cross-post bleed
  setActiveId: (id) => set({ activeId: id }),
  clearActiveId: () => set({ activeId: null }),
}))
