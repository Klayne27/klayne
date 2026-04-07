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
    isEditingPostInline: null,
    replyingToPost: false,

    isPostSlideMenuOpen: false,
    postForSlideMenu: null,

    openPostSlideMenu: (post) =>
      set((state) => {
        state.isPostSlideMenuOpen = true
        state.postForSlideMenu = post
      }),
    closePostSlideMenu: () =>
      set((state) => {
        state.isPostSlideMenuOpen = false
        state.postForSlideMenu = null
      }),
    setReplyingToPost: (value) =>
      set({ replyingToPost: value, replyingToComment: null, editingComment: null }),
    setIsEditingPostInline: (post) =>
      set({ isEditingPostInline: post, replyingToComment: null, editingComment: null }),

    setReplyingToComment: (comment) => set({ replyingToComment: comment, editingComment: null }),
    setEditingComment: (comment) => set({ editingComment: comment, replyingToComment: null }),
    clearReplyAndEdit: () =>
      set({ replyingToComment: null, editingComment: null, replyingToPost: false }),
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
