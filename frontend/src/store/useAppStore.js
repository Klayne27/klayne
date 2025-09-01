import { create } from "zustand"
import { immer } from "zustand/middleware/immer"

const createModalSlice = (set) => ({
  selectedImage: null,
  selectedProfileImage: null,
  showUnfollowModal: false,
  showCreatePostModal: false,
  showEditPostModal: false,
  editPostModalData: null,

  openImageModal: (imageUrl) => set({ selectedImage: imageUrl }),
  closeImageModal: () => set({ selectedImage: null }),

  openProfileImageModal: (imageUrl) => set({ selectedProfileImage: imageUrl }),
  closeProfileImageModal: () => set({ selectedProfileImage: null }),

  toggleUnfollowModal: () => set((state) => ({ showUnfollowModal: !state.showUnfollowModal })),
  setShowUnfollowModal: (isOpen) => set({ showUnfollowModal: isOpen }),

  toggleCreatePostModal: () =>
    set((state) => ({ showCreatePostModal: !state.showCreatePostModal })),
  setShowCreatePostModal: (isOpen) => set({ showCreatePostModal: isOpen }),

  toggleEditPostModal: () => set((state) => ({ showEditPostModal: !state.showEditPostModal })),
  setShowEditPostModal: (isOpen) => set({ showEditPostModal: isOpen }),
  setEditPostModalData: (post) => set({ editPostModalData: post }),
  closeEditPostModal: () => set({ editPostModalData: null }),
})

const createChatSlice = (set) => ({
  isChatWindowOpen: false,

  setIsChatWindowOpen: (isOpen) => set({ isChatWindowOpen: isOpen }),
})

const createMiscSlice = (set) => ({
  feedType: "forYou",

  setFeedType: (type) => set({ feedType: type }),
})

export const useAppStore = create(
  immer((set) => ({
    ...createModalSlice(set),
    ...createChatSlice(set),
    ...createMiscSlice(set),
  })),
)
