import { create } from "zustand"

const useXpStore = create((set) => ({
  showXpGain: false,
  xpGainedAmount: 0,
  setShowXpGain: (show) => set({ showXpGain: show }),
  setXpGainedAmount: (amount) => set({ xpGainedAmount: amount }),
}))

export default useXpStore
