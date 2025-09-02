import { create } from "zustand"

export const useChatViewStore = create((set) => ({
  // The ID of the message to jump to
  messageIdToJumpTo: null,

  // Action to set the target message ID
  setMessageIdToJumpTo: (messageId) => set({ messageIdToJumpTo: messageId }),

  // Action to clear the request after the jump is complete
  clearJumpRequest: () => set({ messageIdToJumpTo: null }),
}))
