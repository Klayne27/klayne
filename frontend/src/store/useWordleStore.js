import { create } from "zustand"

export const useWordleStore = create((set) => ({
  currentGuess: "",
  leaderboardType: "daily",
  setCurrentGuess: (currentGuess) => set({ currentGuess }),
  addLetter: (letter) =>
    set((state) => ({
      currentGuess:
        state.currentGuess.length >= 5 ? state.currentGuess : `${state.currentGuess}${letter}`,
    })),
  removeLetter: () => set((state) => ({ currentGuess: state.currentGuess.slice(0, -1) })),
  clearGuess: () => set({ currentGuess: "" }),
  setLeaderboardType: (leaderboardType) => set({ leaderboardType }),
}))
