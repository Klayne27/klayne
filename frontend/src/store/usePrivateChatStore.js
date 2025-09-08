import { create } from "zustand"
import { immer } from "zustand/middleware/immer"

export const usePrivateChatStore = create(
  immer((set) => ({
    replyingToMessage: null,
    editingMessage: null,
    isTypingOtherUser: false,
    showNewMessageButton: false,
    selectedConversation: null,
    activeMessageModalId: null, // State for the mobile slide-up menu
    isRecording: false, // <-- New state
    audioBlob: null, // <-- New state

    isSlideMenuOpen: false,
    messageForSlideMenu: null,

    setReplyingToMessage: (message) => set({ replyingToMessage: message, editingMessage: null }),
    setEditingMessage: (message) => set({ editingMessage: message, replyingToMessage: null }),
    setShowNewMessageButton: (show) => set({ showNewMessageButton: show }),
    setIsTypingOtherUser: (isTyping) => set({ isTypingOtherUser: isTyping }),
    clearReplyAndEdit: () => set({ replyingToMessage: null }),
    setSelectedConversation: (conversation) => set({ selectedConversation: conversation }),
    setActiveMessageModalId: (id) =>
      set((state) => {
        state.activeMessageModalId = id
      }), // Actions to control the mobile slide-up menu
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
