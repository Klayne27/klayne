import { create } from "zustand"
import { immer } from "zustand/middleware/immer"

export const useBoardStore = create(
  immer((set) => ({
    replyingToComment: null,
    editingComment: null,
    activeCommentModalId: null,
    isSlideMenuOpen: false,
    commentForSlideMenu: null,
    boardInputRef: { current: null },

    setReplyingToComment: (comment) => set({ replyingToComment: comment, editingComment: null }),
    setEditingComment: (comment) => set({ editingComment: comment, replyingToComment: null }),
    clearReplyAndEdit: () => set({ replyingToComment: null, editingComment: null }),
    setActiveCommentModalId: (id) =>
      set((state) => {
        state.activeCommentModalId = id
      }),
    openSlideMenu: (comment) =>
      set((state) => {
        state.isSlideMenuOpen = true
        state.commentForSlideMenu = comment
      }),
    closeSlideMenu: () =>
      set((state) => {
        state.isSlideMenuOpen = false
        state.commentForSlideMenu = null
      }),
  })),
)
