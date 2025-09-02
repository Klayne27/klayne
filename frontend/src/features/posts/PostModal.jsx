// components/PostModal/PostModal.jsx
import { useState, useRef, useEffect, useCallback } from "react"

// Import components
import { PostModalHeader } from "./PostModalHeader"
import { PostModalTextarea } from "./PostModalTextarea"
import { MediaPreview } from "./MediaPreview"
import { PostModalActions } from "./PostModalActions"
import { usePostModalStore } from "../../store/usePostModalStore"
import { usePostModal } from "../../hooks/customHooks/usePostModal"
import { useScheduleModal } from "../../hooks/customHooks/useScheduleModal"
import { usePollModal } from "../../hooks/customHooks/usePollModal"
import { useEmojiPickerPopover } from "../../hooks/customHooks/useEmojiPickerPopover"
import { useAppStore } from "../../store/useAppStore"
import { useCreatePosts } from "./postsHooks/useCreatePosts"
import { useCreateVentPost } from "./postsHooks/useCreateVentPost"
import { useUpdatePost } from "./postsHooks/useUpdatePost"
import { showAppToast } from "../../utils/showAppToast"
import SchedulePostModal from "./post-scheduler/SchedulePostModal"
import ScheduledPostsModal from "./post-scheduler/ScheduledPostsModal"
import EditScheduledPostModal from "./post-scheduler/EditSchedulePostModal"
import { PollInputs } from "./PollInput"

const PostModal = ({
  onClose,
  mode = "create", // "create" or "edit"
  editPost = null,
  title = null,
}) => {
  const modalContentRef = useRef(null)

  // Store state
  const {
    input,
    selectedFile,
    previewImage,
    scheduledAt,
    isAnonymous,
    showPollInputs,
    resetForm,
    initializeForEdit,
    setIsAnonymous,
  } = usePostModalStore()

  // Custom hooks
  const postModal = usePostModal()
  const pollModal = usePollModal()
  const scheduleModal = useScheduleModal()

  const {
    showEmojiPickerPopover,
    popoverPosition,
    handleOpenEmojiPickerPopover,
    handleCloseEmojiPickerPopover,
  } = useEmojiPickerPopover()

  // App state
  const feedType = useAppStore((state) => state.feedType)
  const { setShowCreatePostModal } = useAppStore()

  // Mutations
  const { createPost, isPending: isCreatingPost, isError, error } = useCreatePosts()
  const { createVentPost, isCreatingVentPost } = useCreateVentPost()
  const { updatePost } = useUpdatePost()

  const isPending = isCreatingPost || isCreatingVentPost

  // Initialize for edit mode
  useEffect(() => {
    if (mode === "edit" && editPost) {
      initializeForEdit(editPost)
    }
  }, [mode, editPost, initializeForEdit])

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [])

  // Click outside to close
  const handleBackgroundClick = (e) => {
    e.stopPropagation()
    if (modalContentRef.current && !modalContentRef.current.contains(e.target)) {
      onClose()
    }
  }

  // Emoji handler
  const onEmojiClick = useCallback(
    (emojiObject) => {
      const currentInput = input
      const newInput = currentInput + emojiObject.emoji
      postModal.handleTextChange({ target: { value: newInput, selectionStart: newInput.length } })
      if (postModal.inputRef.current) {
        postModal.inputRef.current.focus()
        postModal.adjustTextareaHeight()
      }
    },
    [input, postModal],
  )

  // Submit handler
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()

      // Prevent duplicate submissions
      if (isPending) return

      // --- Start by building a consistent postData object ---
      const postData = {
        text: input,
        // Add other fields from the form
        isAnonymous: isAnonymous,
      }

      // Add media if a file is selected
      if (selectedFile) {
        try {
          const base64File = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(selectedFile)
          })

          if (selectedFile.type.startsWith("image/")) {
            postData.img = base64File
          } else if (selectedFile.type.startsWith("video/")) {
            postData.video = base64File
          }
        } catch (err) {
          showAppToast("Failed to read file. Please try again.", "error")
          return
        }
      }

      // Handle Poll Post (if poll is active)
      if (showPollInputs) {
        const pollValidation = pollModal.validatePoll()
        if (!pollValidation.valid) {
          showAppToast(pollValidation.message, "error")
          return
        }
        if (input.trim() === "") {
          showAppToast("Polls must have a question.", "error")
          return
        }
        postData.pollOptions = pollValidation.choices.map((c) => ({ text: c.text }))
      }

      // --- Now handle the different modes (edit vs. create) ---
      const commonOnSuccess = () => {
        resetForm()
        onClose()
        // Ensure the store is updated if necessary, e.g., closing the main modal.
        setShowCreatePostModal(false)
      }

      const commonOnError = (err) => {
        showAppToast(err?.message || "Something went wrong.", "error")
      }

      if (mode === "edit") {

        if (input.trim() === editPost.text.trim()) {
          showAppToast("No changes detected.", "info")
          onClose()
          return
        }

        updatePost({
          postId: editPost._id,
          postData: { text: input }, // Correctly format the data for the API call
        })
        resetForm()
        onClose()
      } else if (feedType === "venting") {
        createVentPost(postData, {
          onSuccess: commonOnSuccess,
          onError: commonOnError,
        })
      } else {
        // Regular post
        if (scheduledAt) {
          postData.scheduledAt = scheduledAt
        }
        createPost(postData, {
          onSuccess: commonOnSuccess,
          onError: commonOnError,
        })
      }
    },
    [
      input,
      selectedFile,
      showPollInputs,
      isPending,
      mode,
      feedType,
      isAnonymous,
      scheduledAt,
      editPost,
      pollModal,
      createPost,
      updatePost,
      createVentPost,
      resetForm,
      setShowCreatePostModal,
      onClose,
    ],
  )

  // Determine button state
  const isButtonDisabled =
    isPending ||
    (() => {
      if (scheduledAt && mode !== "edit") {
        return input.trim() === "" || selectedFile !== null || showPollInputs
      }
      if (showPollInputs) {
        const { valid } = pollModal.validatePoll()
        return input.trim() === "" || !valid
      }
      return input.trim() === "" && !selectedFile
    })()

  // Get modal title
  const getTitle = () => {
    if (title) return title
    if (mode === "edit") return "Edit Post"
    return feedType === "venting" ? "Create Rant Post" : "Create Post"
  }

  // Get button text
  const getButtonText = () => {
    if (isPending) {
      return mode === "edit" ? "" : "Posting..."
    }
    if (mode === "edit") return "Update"
    if (scheduledAt) return "Schedule"
    return "Post"
  }

  return (
    <div
      className="fixed inset-0 z-50 justify-center bg-gray-700 bg-opacity-70 p-4"
      onClick={handleBackgroundClick}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        ref={modalContentRef}
        className="mx-auto mt-7 flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-base-100 pl-3 pr-7 shadow-lg"
      >
        <PostModalHeader title={getTitle()} onClose={onClose} />

        <div className="custom-scrollbar flex flex-1 flex-col overflow-y-auto p-4">
          <PostModalTextarea
            input={input}
            scheduledAt={scheduledAt}
            isAnonymous={isAnonymous}
            feedType={feedType}
            showPollInputs={showPollInputs}
            inputRef={postModal.inputRef}
            onTextChange={postModal.handleTextChange}
            onPaste={postModal.handlePaste}
            onSubmit={handleSubmit}
            showMentionSuggestions={postModal.showMentionSuggestions}
            suggestedUsers={postModal.suggestedUsers}
            isLoadingSuggestedUsers={postModal.isLoadingSuggestedUsers}
            suggestionBoxRef={postModal.suggestionBoxRef}
            onMentionSelect={postModal.handleMentionSelect}
            onScheduleClick={scheduleModal.openScheduleModal}
          />

          <MediaPreview
            previewImage={previewImage}
            selectedFile={selectedFile}
            onRemove={postModal.removeFile}
          />

          {showPollInputs && (
            <PollInputs
              pollChoices={pollModal.pollChoices}
              focusedPollInputIndex={pollModal.focusedPollInputIndex}
              onChoiceChange={pollModal.updatePollChoice}
              onAddChoice={pollModal.addPollChoice}
              onRemoveChoice={pollModal.removePollChoice}
              onInputFocus={pollModal.setFocusedPollInputIndex}
              onInputBlur={() => pollModal.setFocusedPollInputIndex(null)}
              onRemovePoll={pollModal.removePoll}
            />
          )}

          {isError && <div className="mt-2 text-red-500">{error.message}</div>}

          <div className="relative flex justify-between pt-3">
            {/* Only show actions in create mode */}
            {mode === "create" && (
              <PostModalActions
                feedType={feedType}
                showPollInputs={showPollInputs}
                scheduledAt={scheduledAt}
                selectedFile={selectedFile}
                isAnonymous={isAnonymous}
                setIsAnonymous={setIsAnonymous}
                fileInputRef={postModal.fileInputRef}
                emojiButtonRef={null}
                showEmojiPickerPopover={showEmojiPickerPopover}
                popoverPosition={popoverPosition}
                onFileInputClick={() => postModal.fileInputRef.current?.click()}
                onPollClick={pollModal.togglePoll}
                onEmojiClick={handleOpenEmojiPickerPopover}
                onScheduleClick={scheduleModal.openScheduleModal}
                onCloseEmojiPicker={handleCloseEmojiPickerPopover}
                onEmojiSelect={onEmojiClick}
                onFileChange={postModal.handleFileChange}
              />
            )}

            <button
              onClick={handleSubmit}
              className="rounded-full bg-primary px-4 py-2 font-bold text-white transition duration-300 hover:bg-primary/80 disabled:cursor-default disabled:bg-slate-500 disabled:text-black md:px-4 md:py-2"
              disabled={isButtonDisabled}
            >
              {getButtonText()}
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Modals - only in create mode */}
      {mode === "create" && (
        <>
          <SchedulePostModal
            isOpen={scheduleModal.showSchedulePostModal}
            onClose={scheduleModal.closeScheduleModal}
            onScheduleConfirm={scheduleModal.handleScheduleConfirm}
            initialDate={scheduledAt}
            openAllScheduledPosts={scheduleModal.openScheduledPostsList}
            scheduledAt={scheduledAt}
            onRemoveSchedule={scheduleModal.removeSchedule}
          />

          <ScheduledPostsModal
            isOpen={scheduleModal.isScheduledPostsModalOpen}
            onClose={scheduleModal.closeScheduledPostsList}
            onPostSelectedForEdit={scheduleModal.selectPostForEdit}
          />

          {scheduleModal.postToEdit && (
            <EditScheduledPostModal
              isOpen={scheduleModal.isEditScheduledPostModalOpen}
              onClose={scheduleModal.closeEditModal}
              post={scheduleModal.postToEdit}
            />
          )}
        </>
      )}
    </div>
  )
}

export default PostModal
