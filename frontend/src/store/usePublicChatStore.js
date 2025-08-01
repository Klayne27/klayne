import { create } from "zustand"
import { immer } from "zustand/middleware/immer"

export const usePublicChatStore = create(
  immer((set) => ({
    replyingToMessage: null,
    editingMessage: null,
    activeMessageModalId: null,
    isCurrentlyTouchDevice: false,
    showNewMessageButton: false,

    // Actions
    setReplyingToMessage: (message) =>
      set((state) => {
        state.replyingToMessage = message
        state.editingMessage = null
      }),

    setEditingMessage: (message) =>
      set((state) => {
        state.editingMessage = message
        state.replyingToMessage = null
      }),

    setActiveMessageModalId: (id) =>
      set((state) => {
        state.activeMessageModalId = id
      }),

    setIsCurrentlyTouchDevice: (isTouch) =>
      set((state) => {
        state.isCurrentlyTouchDevice = isTouch
      }),

    setShowNewMessageButton: (show) =>
      set((state) => {
        state.showNewMessageButton = show
      }),
  })),
)
