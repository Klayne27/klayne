// store/usePostModalStore.js
import { create } from "zustand"

export const usePostModalStore = create((set, get) => ({
  // Post content state
  input: "",
  selectedFile: null,
  previewImage: null,
  scheduledAt: null,
  isAnonymous: false,

  // UI state
  showEmojiPicker: false,
  showPollInputs: false,
  showMentionSuggestions: false,
  focusedPollInputIndex: null,

  // Poll state
  pollChoices: [{ text: "" }, { text: "" }],

  // Mention state
  mentionQuery: "",
  mentionStartIndex: -1,

  // Modal state
  showSchedulePostModal: false,
  isScheduledPostsModalOpen: false,
  isEditScheduledPostModalOpen: false,
  postToEdit: null,

  // Actions
  setInput: (input) => set({ input }),
  setSelectedFile: (file) => set({ selectedFile: file }),
  setPreviewImage: (image) => set({ previewImage: image }),
  setScheduledAt: (date) => set({ scheduledAt: date }),
  setIsAnonymous: (anonymous) => set({ isAnonymous: anonymous }),

  setShowEmojiPicker: (show) => set({ showEmojiPicker: show }),
  setShowPollInputs: (show) => set({ showPollInputs: show }),
  setShowMentionSuggestions: (show) => set({ showMentionSuggestions: show }),
  setFocusedPollInputIndex: (index) => set({ focusedPollInputIndex: index }),

  setPollChoices: (choices) => set({ pollChoices: choices }),
  updatePollChoice: (index, text) =>
    set((state) => {
      const newChoices = [...state.pollChoices]
      newChoices[index].text = text.slice(0, 120) // POLL_CHOICE_MAX_LENGTH
      return { pollChoices: newChoices }
    }),
  addPollChoice: () =>
    set((state) => {
      if (state.pollChoices.length < 4) {
        // MAX_POLL_CHOICES
        return { pollChoices: [...state.pollChoices, { text: "" }] }
      }
      return state
    }),
  removePollChoice: (indexToRemove) =>
    set((state) => {
      let newChoices = state.pollChoices.filter((_, i) => i !== indexToRemove)
      while (newChoices.length < 2) {
        newChoices.push({ text: "" })
      }
      return { pollChoices: newChoices }
    }),

  setMentionQuery: (query) => set({ mentionQuery: query }),
  setMentionStartIndex: (index) => set({ mentionStartIndex: index }),

  setShowSchedulePostModal: (show) => set({ showSchedulePostModal: show }),
  setIsScheduledPostsModalOpen: (open) => set({ isScheduledPostsModalOpen: open }),
  setIsEditScheduledPostModalOpen: (open) => set({ isEditScheduledPostModalOpen: open }),
  setPostToEdit: (post) => set({ postToEdit: post }),

  // Complex actions
  resetForm: () =>
    set({
      input: "",
      selectedFile: null,
      previewImage: null,
      scheduledAt: null,
      isAnonymous: false,
      showEmojiPicker: false,
      showPollInputs: false,
      showMentionSuggestions: false,
      focusedPollInputIndex: null,
      pollChoices: [{ text: "" }, { text: "" }],
      mentionQuery: "",
      mentionStartIndex: -1,
    }),

  clearConflictingStates: (except = []) => {
    const updates = {}

    if (!except.includes("file")) {
      updates.selectedFile = null
      updates.previewImage = null
    }
    if (!except.includes("poll")) {
      updates.showPollInputs = false
      updates.pollChoices = [{ text: "" }, { text: "" }]
    }
    if (!except.includes("schedule")) {
      updates.scheduledAt = null
    }
    if (!except.includes("mention")) {
      updates.showMentionSuggestions = false
      updates.mentionQuery = ""
      updates.mentionStartIndex = -1
    }

    set(updates)
  },

  // Initialize for editing
  initializeForEdit: (post) =>
    set({
      input: post.text || "",
      selectedFile: null,
      previewImage: post.img?.imageUrl || post.video?.videoUrl || null,
      scheduledAt: post.scheduledAt || null,
      isAnonymous: post.isAnonymous || false,
      showPollInputs: !!post.pollOptions?.length,
      pollChoices: post.pollOptions?.map((opt) => ({ text: opt.text })) || [
        { text: "" },
        { text: "" },
      ],
    }),
}))
