import { create } from "zustand"

export const useChatViewStore = create((set) => ({
  messageIdToJumpTo: null,

  setMessageIdToJumpTo: (messageId) => set({ messageIdToJumpTo: messageId }),

  clearJumpRequest: () => set({ messageIdToJumpTo: null }),
}))
