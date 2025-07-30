import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export const usePrivateChatStore = create(
  immer((set) => ({
    replyingToMessage: null,
    editingMessage: null,
    isTypingOtherUser: false,
    showNewMessageButton: false,
    selectedConversation: null,

    setReplyingToMessage: (message) =>
      set({ replyingToMessage: message, editingMessage: null }),
    setEditingMessage: (message) =>
      set({ editingMessage: message, replyingToMessage: null }),
    setShowNewMessageButton: (show) => set({ showNewMessageButton: show }),
    setIsTypingOtherUser: (isTyping) => set({ isTypingOtherUser: isTyping }),
    clearReplyAndEdit: () => set({ replyingToMessage: null }),
    setSelectedConversation: (conversationId) =>
      set({ selectedConversation: conversationId }),
  }))
);
