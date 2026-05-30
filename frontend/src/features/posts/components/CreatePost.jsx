import { useRef, useState, useEffect, useCallback } from "react"
import { IoClose, IoCloseSharp } from "react-icons/io5"
import { PiSmiley } from "react-icons/pi"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { Link } from "react-router-dom"
import { BiImageAdd, BiPoll } from "react-icons/bi"
import { FaPlus } from "react-icons/fa6"
import { TbCalendarClock } from "react-icons/tb"
import SchedulePostModal from "./SchedulePostModal"
import ScheduledPostsModal from "./ScheduledPostsModal"
import EditScheduledPostModal from "./EditSchedulePostModal"
import { useDebounce } from "../../../hooks/customHooks/useDebounce"
import { showAppToast } from "../../../utils/showAppToast"
import { useSocket } from "../../../context/SocketContext"
import { useQueryClient } from "@tanstack/react-query"
import { useIsMobile } from "../../../hooks/customHooks/useIsMobile"
import { usePasteHandler } from "../../../hooks/customHooks/usePasteHandler"
import { useEmojiPickerPopover } from "../../../hooks/customHooks/useEmojiPickerPopover"
import EmojiPickerPopover from "../../../components/common/EmojiPickerPopover"
import {
  MAX_FILE_SIZE_MB,
  MAX_POLL_CHOICES,
  POLL_CHOICE_MAX_LENGTH,
} from "../../../constants/numberConstants"
import { postKeys } from "../postsHooks/postKeys"
import LoadingSpinner from "../../../components/common/LoadingSpinner"
import CircularBarProgress from "../../../components/common/CircularBarProgress"
import { getOptimizedImageUrl } from "../../../utils/cloudinaryUtils"
import { useSearchUsers } from "../../users/usersHooks/useUserMutations"
import {
  useCreatePosts,
  useCreateVentPost,
  useMarkICPostsAsRead,
  useMarkPostsAsRead,
  useMarkVentPostsAsRead,
} from "../postsHooks/usePostsMutations"
import ImagePreviewCloseButton from "../../../components/common/ImagePreviewCloseButton"
import UserAvatar from "../../../components/common/UserAvatar"
import UserFullName from "../../../components/common/UserFullname"
import { useMentionSuggestions } from "../../../hooks/customHooks/useMentionSuggestions"
import MentionSuggestionsDropdown from "../../../components/common/MentionSuggestionsDropdown"
import { shouldTextBeWhite } from "../../../utils/shouldTextBeWhite"
import { useTheme } from "../../../context/ThemeContext"

const CHARACTER_LIMIT_STANDARD = 400
const CHARACTER_LIMIT_VERIFIED = 800

const CreatePost = ({ feedType }) => {
  const {
    newPostCount,
    setShowNewFeedPostsButton,
    newVentPostCount,
    setShowNewVentPostsButton,
    newICPostCount,
    setShowNewICPostsButton,
  } = useSocket()
  const queryClient = useQueryClient()

  // State for post content
  const [postInput, setPostInput] = useState("")
  // const [postSelectedFile, setPostSelectedFile] = useState(null)
  // const [postPreviewImage, setPostPreviewImage] = useState(null)

  // State for emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // State for poll feature
  const [showPollInputs, setShowPollInputs] = useState(false)
  const [pollChoices, setPollChoices] = useState([{ text: "" }, { text: "" }])
  const [focusedPollInputIndex, setFocusedPollInputIndex] = useState(null)

  // State for schedule post feature (for NEW posts)
  const [showSchedulePostModal, setShowSchedulePostModal] = useState(false) // Renamed for clarity
  const [scheduledAt, setScheduledAt] = useState(null) // Stores the ISO string from the modal

  // State for viewing ALL scheduled posts

  // State for showing edit schedule modal
  const [isScheduledPostsModalOpen, setIsScheduledPostsModalOpen] = useState(false)
  const [isEditScheduledPostModalOpen, setIsEditScheduledPostModalOpen] = useState(false)
  const [postToEdit, setPostToEdit] = useState(null)

  const [postSelectedFiles, setPostSelectedFiles] = useState([]) // File[]
  const [postPreviewImages, setPostPreviewImages] = useState([]) // string[] (object URLs)

  // State for mention feature
  // const [mentionQuery, setMentionQuery] = useState("")
  // const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  // const [mentionStartIndex, setMentionStartIndex] = useState(-1)

  // const debouncedMentionSearchTerm = useDebounce(mentionQuery, 300)

  // Refs
  const postFileInputRef = useRef(null)
  const emojiPickerRef = useRef(null)
  const emojiButtonRef = useRef(null)
  const postInputRef = useRef(null)
  // const suggestionBoxRef = useRef(null)

  // Hooks
  const { authUser } = useAuthUser()
  const { createPost, isPending, isError, error } = useCreatePosts()
  const { createVentPost, isCreatingVentPost } = useCreateVentPost()
  const [isAnonymous, setIsAnonymous] = useState(false)

  const isMobile = useIsMobile()
  const { theme } = useTheme()

  // Fetch mention suggestions using react-query
  // const { suggestedUsers, isLoadingSuggestedUsers } = useSearchUsers(debouncedMentionSearchTerm)
  const { markFeedAsRead } = useMarkPostsAsRead()
  const { markVentFeedAsRead } = useMarkVentPostsAsRead()
  const { markICPostsAsRead } = useMarkICPostsAsRead()

  const {
    debouncedMentionSearchTerm,
    showMentionSuggestions,
    suggestedUsers,
    isLoadingSuggestedUsers,
    focusedMentionIndex,
    handleMentionTextChange,
    handleMentionKeyDown,
    handleSelectMention,
    closeMentionSuggestions,
  } = useMentionSuggestions({
    textInput: postInput,
    setTextInput: setPostInput,
    inputRef: postInputRef,
    authUser,
  })

  // Determine character limit based on user status
  const characterLimit =
    authUser?.isVerified || authUser?.isGoldVerified
      ? CHARACTER_LIMIT_VERIFIED
      : CHARACTER_LIMIT_STANDARD

  // Effect to close emoji picker on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false)
      }
    }
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showEmojiPicker])

  // Effect to manage textarea height dynamically
  useEffect(() => {
    if (postInputRef.current) {
      postInputRef.current.style.height = "auto"
      postInputRef.current.style.height = postInputRef.current.scrollHeight + "px"
    }
  }, [postInput, showPollInputs]) // Also react to poll input visibility as it changes layout

  // Handlers

  const resetForm = useCallback(() => {
    setPostInput("")
    // setPostSelectedFile(null)
    // setPostPreviewImage(null)
    setShowPollInputs(false)
    setPollChoices([{ text: "" }, { text: "" }])
    setScheduledAt(null)
    setShowEmojiPicker(false)
    setPostSelectedFiles([])
    setPostPreviewImages([])
    closeMentionSuggestions() // replaces the three manual mention resets
    if (postFileInputRef.current) postFileInputRef.current.value = null
    if (postInputRef.current) postInputRef.current.style.height = "auto"
  }, [closeMentionSuggestions])

  const handleNewPostsButtonClick = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })

    if (feedType === "venting") {
      // New check
      queryClient.invalidateQueries({ queryKey: postKeys.list("/api/posts/vent") })
      markVentFeedAsRead()
      setShowNewVentPostsButton(false)
    } else if (feedType === "forYou") {
      queryClient.invalidateQueries({ queryKey: postKeys.list("/api/posts/all") })
      markFeedAsRead()
      setShowNewFeedPostsButton(false)
    } else {
      queryClient.invalidateQueries({ queryKey: postKeys.list("/api/posts/ic") })
      markICPostsAsRead()
      setShowNewICPostsButton(false)
    }
  }, [
    queryClient,
    setShowNewFeedPostsButton,
    markFeedAsRead,
    markVentFeedAsRead,
    markICPostsAsRead,
    feedType,
    setShowNewVentPostsButton,
    setShowNewICPostsButton,
  ])

const handlePaste = usePasteHandler({
  inputRef: postInputRef,
  input: postInput,
  setInput: setPostInput,
  // multi-image mode
  setSelectedFiles: setPostSelectedFiles, // was: setSelectedFile
  setPreviewImages: setPostPreviewImages, // was: setPreviewImage
  currentImageCount: postSelectedFiles.length, // new — enforces the 4-cap
  fileInputRef: postFileInputRef, // was: postFileInputRef (wrong key)
})

  const {
    showEmojiPickerPopover,
    popoverPosition,
    handleOpenEmojiPickerPopover,
    handleCloseEmojiPickerPopover,
  } = useEmojiPickerPopover()

  const handleTextChange = useCallback(
    (e) => {
      const newText = e.target.value
      setPostInput(newText)

      if (postInputRef.current) {
        postInputRef.current.style.height = "auto"
        postInputRef.current.style.height = postInputRef.current.scrollHeight + "px"
      }

      handleMentionTextChange(e) // delegates all mention state to the hook
    },
    [handleMentionTextChange],
  )

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()

      if (postInput.trim() === "" && !postSelectedFiles.length > 0  && !showPollInputs) return
      if (isCreatingVentPost || isPending) return

      // --- 1. Prepare postData ---
      let postData = {
        text: postInput,
        isStudy: feedType === "ic",
      }

      // --- 2. Handle Polls ---
      if (showPollInputs) {
        const filledPollChoices = pollChoices.filter((choice) => choice.text.trim() !== "")
        if (postInput.trim() === "" || filledPollChoices.length < 2) {
          showAppToast("Polls must have a question and at least two options.", "error")
          return
        }
        postData.pollOptions = filledPollChoices.map((c) => ({ text: c.text }))
      }

      // --- 3. Handle Media (Only if not a poll) ---
      else if (postSelectedFiles.length > 0) {
        const isVideo = postSelectedFiles[0].type.startsWith("video/")
        const base64s = await Promise.all(
          postSelectedFiles.map(
            (file) =>
              new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result)
                reader.onerror = reject
                reader.readAsDataURL(file)
              }),
          ),
        )
        if (isVideo) {
          postData.video = base64s[0]
        } else {
          postData.imgs = base64s // ← array, not single `img`
        }
      }

      // --- 4. Final Submission Logic ---
      if (feedType === "venting") {
        postData.isAnonymous = isAnonymous
        // We use the specific Venting mutation here
        createVentPost(postData, {
          onSuccess: () => {
            resetForm()
            setIsAnonymous(false)
          },
          onError: (err) => showAppToast(err?.message || "Failed to create vent post.", "error"),
        })
      } else {
        if (scheduledAt) postData.scheduledAt = scheduledAt
        createPost(postData, {
          onSuccess: resetForm,
          onError: (err) => showAppToast(err?.message || "Failed to create post.", "error"),
        })
      }
    },
    [
      feedType,
      createVentPost,
      isCreatingVentPost,
      isAnonymous,
      postInput,
      // postSelectedFile,
      showPollInputs,
      pollChoices,
      scheduledAt,
      createPost,
      resetForm,
      isPending,
      postSelectedFiles,
    ],
  )

  const handleFileChange = useCallback(
    (e) => {
      const files = Array.from(e.target.files)
      const imageFiles = files.filter((f) => f.type.startsWith("image/"))
      const videoFile = files.find((f) => f.type.startsWith("video/"))

      // If any video — single video only, existing logic
      if (videoFile && files.length === 1) {
        // ... existing video validation logic unchanged ...
        setPostSelectedFiles([videoFile])
        setPostPreviewImages([URL.createObjectURL(videoFile)])
        return
      }

      // Multi-image: cap at 4, images only
      const remaining = 4 - postSelectedFiles.length
      const toAdd = imageFiles.slice(0, remaining)
      if (toAdd.length === 0) return

      setPostSelectedFiles((prev) => [...prev, ...toAdd])
      setPostPreviewImages((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))])
      e.target.value = null // reset so same file can be re-selected
    },
    [postSelectedFiles],
  )

  const onEmojiClick = useCallback((emojiObject) => {
    setPostInput((prevText) => prevText + emojiObject.emoji)
    postInputRef.current.focus()
  }, [])

  const handleKeyDown = useCallback(
    (e) => {
      handleMentionKeyDown(e)
      if (e.defaultPrevented) return // mention consumed the key

      if (isMobile) return
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSubmit(e)
      }
    },
    [handleMentionKeyDown, isMobile, handleSubmit],
  )

  const handleAddPollChoice = useCallback(() => {
    if (pollChoices.length < MAX_POLL_CHOICES) {
      setPollChoices([...pollChoices, { text: "" }])
    }
  }, [pollChoices])

  const handlePollChoiceChange = useCallback(
    (index, value) => {
      const newChoices = [...pollChoices]
      newChoices[index].text = value.slice(0, POLL_CHOICE_MAX_LENGTH)
      setPollChoices(newChoices)
    },
    [pollChoices],
  )

  const handleRemovePollChoice = useCallback(
    (indexToRemove) => {
      const newChoices = pollChoices.filter((_, i) => i !== indexToRemove)
      // Ensure at least two choices remain
      while (newChoices.length < 2) {
        newChoices.push({ text: "" })
      }
      setPollChoices(newChoices)
    },
    [pollChoices],
  )

  const handleRemovePoll = useCallback(() => {
    setShowPollInputs(false)
    setPollChoices([{ text: "" }, { text: "" }])
    if (postInputRef.current) {
      postInputRef.current.style.height = "auto"
    }
  }, [])

  const handlePollIconClick = useCallback(() => {
    setShowPollInputs((prev) => !prev)
    if (!showPollInputs) {
      // If turning poll inputs ON, clear other conflicting states
      // setPostSelectedFile(null)
      // setPostPreviewImage(null)
      setPostSelectedFiles([])
      setPostPreviewImages([])
      if (postFileInputRef.current) postFileInputRef.current.value = null
      setScheduledAt(null)
      setPollChoices([{ text: "" }, { text: "" }])
      closeMentionSuggestions()
    }
  }, [showPollInputs])

  const handlePollInputFocus = useCallback((index) => {
    setFocusedPollInputIndex(index)
  }, [])

  const handlePollInputBlur = useCallback(() => {
    setFocusedPollInputIndex(null)
  }, [])

  // Handlers for SchedulePostModal (for new posts)
  const handleOpenSchedulePostModal = useCallback(() => {
    setShowSchedulePostModal(true)
    // When opening schedule modal, clear other conflicting states
    // setPostSelectedFile(null)
    // setPostPreviewImage(null)
    setPostSelectedFiles([])
    setPostPreviewImages([])
    if (postFileInputRef.current) postFileInputRef.current.value = null
    setShowPollInputs(false)
    setPollChoices([{ text: "" }, { text: "" }])
  }, [])

  const handleCloseSchedulePostModal = useCallback(() => {
    setShowSchedulePostModal(false)
  }, [])

  const handleScheduleConfirm = useCallback((isoDateTime) => {
    setScheduledAt(isoDateTime)
    setShowSchedulePostModal(false)
  }, [])

  const handleRemoveSchedule = useCallback(() => {
    setScheduledAt(null)
    setShowSchedulePostModal(false)
  }, [])

  const handleOpenScheduledPostsListModal = useCallback(() => {
    setIsScheduledPostsModalOpen(true) // Control the list modal
    setShowSchedulePostModal(false) // Close the new post schedule modal if open
    setIsEditScheduledPostModalOpen(false) // Ensure edit modal is closed
    setPostToEdit(null) // Clear any previously selected post for edit
  }, [])

  // This function closes the ScheduledPostsModal (the list)
  const handleCloseScheduledPostsListModal = useCallback(() => {
    setIsScheduledPostsModalOpen(false)
    setShowSchedulePostModal(true)
  }, [])

  // This function is called when a post item is clicked in ScheduledPostsModal
  const handlePostSelectedForEdit = (post) => {
    setIsScheduledPostsModalOpen(false) // Close the list modal
    setPostToEdit(post) // Set the post data
    setIsEditScheduledPostModalOpen(true) // Open the edit modal
  }

  // This function is called when EditScheduledPostModal is closed
  const handleCloseEditScheduledPostModal = () => {
    setIsEditScheduledPostModalOpen(false) // Close the edit modal
    setPostToEdit(null) // Clear the post data

    // Option 1: Go back to the list of scheduled posts
    setIsScheduledPostsModalOpen(true)
    // Option 2: Just close all modals and return to main CreatePost screen
    // setIsScheduledPostsModalOpen(false); // If you prefer this behavior
  }

  const handleRemovePreviewImage = useCallback((index) => {
    setPostSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    setPostPreviewImages((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const postLength = postInput.length
  const progress = (postLength / characterLimit) * 100

  const progressColor =
    postLength > characterLimit
      ? "text-red-500"
      : progress >= 100
        ? "text-green-500"
        : "text-primary"

  // Determine if the post button should be disabled
  const isButtonDisabled =
    postLength > characterLimit ||
    isPending ||
    (() => {
      if (scheduledAt) {
        // Scheduled post requires text, and cannot have media or be a poll
        return postInput.trim() === "" || postSelectedFiles.length > 0 || showPollInputs
      }
      if (showPollInputs) {
        // Poll requires postInput and at least two non-empty choices, and no choice exceeds max length
        return (
          postInput.trim() === "" ||
          pollChoices[0].text.trim() === "" ||
          pollChoices[1].text.trim() === "" ||
          pollChoices.some((choice) => choice.text.length > POLL_CHOICE_MAX_LENGTH)
        )
      }
      // Regular post requires text OR a selected file
      return postInput.trim() === "" && postSelectedFiles.length === 0
    })()

  return (
    <>
      <div
        className={`relative flex items-start gap-3 border-b border-accent p-4 ${
          scheduledAt ? "mt-2" : ""
        } `}
      >
        {scheduledAt && (
          <div
            className="absolute left-[66px] top-0 flex items-center justify-between"
            onClick={handleOpenSchedulePostModal}
          >
            <p className="flex cursor-pointer items-center gap-3 text-sm text-slate-500 hover:underline">
              <TbCalendarClock size={16} />
              Will send on{" "}
              {new Date(scheduledAt).toLocaleString([], {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </p>
          </div>
        )}
        {isAnonymous && feedType === "venting" ? (
          <div className="">
            <div className="w-10">
              <img src="/avatar-placeholder.png" alt="Anonymous Avatar" className="rounded-full" />
            </div>
          </div>
        ) : (
          <Link to={`/profile/${authUser.username}`}>
            <div className={` ${scheduledAt ? "mt-1" : ""}`}>
              <div className="flex w-full rounded-full">
                <UserAvatar user={authUser} size={"md"} />
              </div>
            </div>
          </Link>
        )}
        <form
          className={`relative flex w-full flex-col ${scheduledAt ? "mt-1" : ""}`}
          onSubmit={handleSubmit}
        >
          <div className="relative w-full">
            <textarea
              className="relative max-h-[270px] w-full resize-none overflow-y-auto border-none border-gray-800 bg-inherit p-0 pb-4 text-xl focus:outline-none"
              placeholder={
                feedType === "venting"
                  ? "Let it out"
                  : scheduledAt
                    ? "What is happening?"
                    : showPollInputs
                      ? "Ask a question"
                      : feedType === "ic"
                        ? "Share your studies"
                        : "What is happening?"
              }
              value={postInput}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              ref={postInputRef}
              rows={2}
              style={{ minHeight: "28px" }}
            />
            {showMentionSuggestions && !showPollInputs && (
              <div
                className="absolute z-50 w-full"
                style={{ top: postInputRef.current?.scrollHeight || 0, left: 0 }}
              >
                <MentionSuggestionsDropdown
                  users={suggestedUsers}
                  isLoading={isLoadingSuggestedUsers}
                  query={debouncedMentionSearchTerm}
                  onSelect={handleSelectMention}
                  focusedIndex={focusedMentionIndex}
                  direction="down" // ← opens downward below the reply input area
                />
              </div>
            )}
          </div>

          {postPreviewImages.length > 0 && (
            <div
              className={`grid gap-1 overflow-hidden rounded-2xl ${
                postPreviewImages.length === 1 ? "grid-cols-1" : "grid-cols-2"
              }`}
            >
              {postPreviewImages.map((src, i) => {
                const file = postSelectedFiles[i]
                // Unified media class: Ensures equal sizing via aspect-square
                const mediaClass = "w-full aspect-square object-cover rounded-lg"

                return (
                  <div key={i} className="relative">
                    {file?.type.startsWith("video/") ? (
                      <video src={src} controls className={mediaClass} preload="metadata" />
                    ) : (
                      <img src={src} className={mediaClass} alt={`preview ${i + 1}`} />
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemovePreviewImage(i)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                    >
                      <IoClose size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* --- POLL INPUTS SECTION START --- */}
          {showPollInputs && (
            <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-accent p-3">
              {pollChoices.map((choice, index) => (
                <div key={index} className="relative flex items-center gap-1">
                  <div className={`relative ${pollChoices.length > 3 ? "w-full" : "mr-7 w-full"}`}>
                    <input
                      type="text"
                      placeholder={`Choice ${index + 1}`}
                      className={`border border-accent bg-black/0 p-2 py-3 ${
                        pollChoices.length > 3 ? "w-full" : "mr-7 w-full"
                      } focus:border-accent/99 rounded-[4px] placeholder:text-slate-500 focus:outline-none`}
                      value={choice.text}
                      onChange={(e) => handlePollChoiceChange(index, e.target.value)}
                      onFocus={() => handlePollInputFocus(index)}
                      onBlur={handlePollInputBlur}
                      maxLength={POLL_CHOICE_MAX_LENGTH}
                    />

                    {focusedPollInputIndex === index && (
                      <span className="absolute right-2 top-1 text-xs text-slate-500">
                        {choice.text.length} / {POLL_CHOICE_MAX_LENGTH}
                      </span>
                    )}

                    {index >= 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePollChoice(index)}
                        className="absolute right-1 top-3.5 text-red-600 transition duration-200 hover:text-red-400"
                      >
                        <IoCloseSharp size={23} />
                      </button>
                    )}
                  </div>
                  {index === pollChoices.length - 1 && pollChoices.length < MAX_POLL_CHOICES && (
                    <button
                      type="button"
                      onClick={handleAddPollChoice}
                      className="absolute right-0 text-primary transition duration-200 hover:text-blue-400"
                    >
                      <FaPlus size={18} />
                    </button>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleRemovePoll}
                  className="mb-1 mt-2 rounded-full px-3 py-1 text-red-600 transition duration-200 hover:text-red-400"
                >
                  Remove poll
                </button>
              </div>
            </div>
          )}
          {/* --- POLL INPUTS SECTION END --- */}

          <div className="flex justify-between pt-3">
            {feedType !== "venting" && (
              <div className="flex items-center gap-1">
                {/* Image/Video input - hidden if poll or schedule is active */}
                {!showPollInputs && !scheduledAt && postSelectedFiles.length < 4 && (
                  <BiImageAdd
                    className="h-6 w-6 cursor-pointer text-primary hover:text-primary/80"
                    onClick={() => postFileInputRef.current.click()}
                    title="Add image or video"
                    aria-label="Add image or video"
                  />
                )}
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple // ← add
                  hidden
                  ref={postFileInputRef}
                  onChange={handleFileChange}
                />

                {/* Poll icon - hidden if media or schedule is selected/previewed */}
                {postSelectedFiles.length === 0 && !scheduledAt && (
                  <BiPoll
                    className="size-6 cursor-pointer text-primary hover:text-primary/80"
                    onClick={handlePollIconClick}
                    title="Add a poll"
                    aria-label="Add a poll"
                  />
                )}

                {/* Emoji picker */}
                <div className="relative">
                  <PiSmiley
                    ref={emojiButtonRef}
                    className="hidden cursor-pointer text-primary hover:text-primary/80 md:block"
                    size={22}
                    onClick={(e) => handleOpenEmojiPickerPopover(e)}
                    strokeWidth={10}
                    title="Choose an emoji"
                    aria-label="Choose an emoji"
                  />
                  {showEmojiPickerPopover && (
                    <>
                      <div
                        className="fixed inset-0 z-10 cursor-default bg-transparent"
                        onClick={handleCloseEmojiPickerPopover}
                      ></div>
                      <div className="absolute -left-40 bottom-full z-10">
                        <EmojiPickerPopover
                          position={popoverPosition}
                          onClose={handleCloseEmojiPickerPopover}
                          onEmojiClick={onEmojiClick}
                          triggerRef={emojiButtonRef}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Schedule NEW Post icon - hidden if media or poll is active */}
                {postSelectedFiles.length === 0 && !showPollInputs && (
                  <TbCalendarClock
                    size={22}
                    className="cursor-pointer text-primary hover:text-primary/80"
                    onClick={handleOpenSchedulePostModal} // Changed to open SchedulePostModal
                    title="Schedule post"
                    aria-label="Schedule new post"
                  />
                )}
              </div>
            )}

            {feedType === "venting" && (
              <div className="flex w-full items-center justify-between gap-1 pr-2">
                <div className="flex gap-1">
                  {!showPollInputs && !scheduledAt && postSelectedFiles.length < 4 && (
                    <BiImageAdd
                      className="h-6 w-6 cursor-pointer text-primary hover:text-primary/80"
                      onClick={() => postFileInputRef.current.click()}
                      title="Add image or video"
                      aria-label="Add image or video"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    hidden
                    ref={postFileInputRef}
                    onChange={handleFileChange}
                  />

                  {postSelectedFiles.length === 0 && !scheduledAt && (
                    <BiPoll
                      className="size-6 cursor-pointer text-primary hover:text-primary/80"
                      onClick={handlePollIconClick}
                      title="Add a poll"
                      aria-label="Add a poll"
                    />
                  )}

                  <div className="relative flex items-center">
                    <PiSmiley
                      ref={emojiButtonRef}
                      className="hidden cursor-pointer text-primary hover:text-primary/80 md:block"
                      size={22}
                      onClick={(e) => handleOpenEmojiPickerPopover(e)}
                      strokeWidth={10}
                      title="Choose an emoji"
                      aria-label="Choose an emoji"
                    />
                    {showEmojiPickerPopover && (
                      <>
                        <div
                          className="fixed inset-0 z-10 cursor-default bg-transparent"
                          onClick={handleCloseEmojiPickerPopover}
                        ></div>
                        <div className="absolute -left-40 bottom-full z-10">
                          <EmojiPickerPopover
                            position={popoverPosition}
                            onClose={handleCloseEmojiPickerPopover}
                            onEmojiClick={onEmojiClick}
                            triggerRef={emojiButtonRef}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500 md:text-sm">
                  <input
                    type="checkbox"
                    className="checkbox-primary checkbox checkbox-xs"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                  />
                  Post Anonymously
                </label>
              </div>
            )}
            <div className="flex gap-2">
              {postLength > 0 && postSelectedFiles.length === 0 && !showPollInputs && (
                <>
                  <div className="flex items-center gap-2">
                    <CircularBarProgress
                      progress={progress}
                      size={20}
                      strokeWidth={2}
                      progressColor={progressColor}
                    />
                  </div>
                  <div className="h-10 w-[1px] bg-gray-600" />
                </>
              )}
              <button
                type="submit"
                className={`rounded-full bg-primary px-3 py-1 font-bold ${shouldTextBeWhite(theme)} transition duration-300 hover:bg-primary/80 disabled:cursor-default disabled:bg-slate-500 disabled:text-black md:px-4 md:py-2`}
                // --- MODIFIED: Update disabled logic ---
                disabled={
                  (feedType === "venting" ? isCreatingVentPost : isPending) || isButtonDisabled
                }
              >
                {/* --- MODIFIED: Update button text logic --- */}
                {feedType === "venting"
                  ? isCreatingVentPost
                    ? "Posting..."
                    : "Post"
                  : isPending
                    ? "Posting..."
                    : scheduledAt
                      ? "Schedule"
                      : "Post"}
              </button>
            </div>
          </div>
          {isError && <div className="mt-2 text-red-500">{error.message}</div>}
        </form>

        {/* Schedule Post Modal (for NEW posts) */}
        <SchedulePostModal
          isOpen={showSchedulePostModal} // Changed state name
          onClose={handleCloseSchedulePostModal} // Changed handler name
          onScheduleConfirm={handleScheduleConfirm}
          initialDate={scheduledAt} // Pass current scheduledAt if editing
          openAllScheduledPosts={handleOpenScheduledPostsListModal}
          scheduledAt={scheduledAt}
          onRemoveSchedule={handleRemoveSchedule}
        />

        {/* Scheduled Posts List Modal (to view/manage ALL existing scheduled posts) */}
        <ScheduledPostsModal
          isOpen={isScheduledPostsModalOpen}
          onClose={handleCloseScheduledPostsListModal}
          onPostSelectedForEdit={handlePostSelectedForEdit} // Pass the new handler
        />

        {/* Render EditScheduledPostModal separately */}
        {postToEdit && ( // Only render if there's a post to edit
          <EditScheduledPostModal
            isOpen={isEditScheduledPostModalOpen}
            onClose={handleCloseEditScheduledPostModal}
            post={postToEdit}
          />
        )}
      </div>
      {feedType === "venting" && newVentPostCount > 0 && (
        <div
          onClick={handleNewPostsButtonClick}
          className="cursor-pointer border-b border-accent py-3 text-center text-primary transition duration-500 hover:bg-gray-700/30"
        >
          Show {newVentPostCount} rants
        </div>
      )}
      {feedType === "forYou" && newPostCount > 0 && (
        <div
          onClick={handleNewPostsButtonClick}
          className="cursor-pointer border-b border-accent py-3 text-center text-primary transition duration-500 hover:bg-gray-700/30"
        >
          Show {newPostCount} post{newPostCount > 1 ? "s" : ""}
        </div>
      )}
      {feedType === "ic" && newICPostCount > 0 && (
        <div
          onClick={handleNewPostsButtonClick}
          className="cursor-pointer border-b border-accent py-3 text-center text-primary transition duration-500 hover:bg-gray-700/30"
        >
          <span>
            {" "}
            Show {newICPostCount} post{newICPostCount > 1 ? "s" : ""}
          </span>
        </div>
      )}
    </>
  )
}
export default CreatePost
