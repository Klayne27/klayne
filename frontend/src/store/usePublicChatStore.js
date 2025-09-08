import { create } from "zustand"
import { immer } from "zustand/middleware/immer"

export const usePublicChatStore = create(
  immer((set) => ({
    replyingToMessage: null,
    editingMessage: null,
    activeMessageModalId: null,
    isCurrentlyTouchDevice: false,
    showNewMessageButton: false,
    isRecording: false, // <-- New state
    audioBlob: null, // <-- New state

    isSlideMenuOpen: false,
    messageForSlideMenu: null,

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

    openSlideMenu: (message) =>
      set((state) => {
        state.isSlideMenuOpen = true
        state.messageForSlideMenu = message
      }),
    closeSlideMenu: () =>
      set((state) => {
        state.isSlideMenuOpen = false
        state.messageForSlideMenu = null
      }),
    setIsRecording: (isRecording) => set({ isRecording }),
    setAudioBlob: (audioBlob) => set({ audioBlob }),
    clearAudioBlob: () => set({ audioBlob: null }), // Utility to clear the recording
  })),
)
