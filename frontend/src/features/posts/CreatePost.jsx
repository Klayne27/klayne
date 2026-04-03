import { useRef, useState, useEffect, useCallback } from "react"
import { IoClose, IoCloseSharp } from "react-icons/io5"
import { PiSmiley } from "react-icons/pi"
import { useAuthUser } from "../auth/authHooks/useAuthUser"
import { Link } from "react-router-dom"
import { BiImageAdd, BiPoll } from "react-icons/bi"
import { FaPlus } from "react-icons/fa6"
import { TbCalendarClock } from "react-icons/tb"
import SchedulePostModal from "./post-scheduler/SchedulePostModal"
import ScheduledPostsModal from "./post-scheduler/ScheduledPostsModal"
import EditScheduledPostModal from "./post-scheduler/EditSchedulePostModal"
import { useDebounce } from "../../hooks/customHooks/useDebounce"
import { showAppToast } from "../../utils/showAppToast"
import { useSocket } from "../../context/SocketContext"
import { useQueryClient } from "@tanstack/react-query"
import { useIsMobile } from "../../hooks/customHooks/useIsMobile"
import { usePasteHandler } from "../../hooks/customHooks/usePasteHandler"
import { useEmojiPickerPopover } from "../../hooks/customHooks/useEmojiPickerPopover"
import EmojiPickerPopover from "../../components/common/EmojiPickerPopover"
import {
  MAX_FILE_SIZE_MB,
  MAX_POLL_CHOICES,
  POLL_CHOICE_MAX_LENGTH,
} from "../../constants/numberConstants"
import { postKeys } from "./postsHooks/postKeys"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import CircularBarProgress from "../../components/common/CircularBarProgress"
import { getOptimizedImageUrl } from "../../utils/cloudinaryUtils"
import { useSearchUsers } from "../users/usersHooks/useUserMutations"
import { useCreatePosts, useCreateVentPost, useMarkICPostsAsRead, useMarkPostsAsRead, useMarkVentPostsAsRead } from "./postsHooks/usePostsMutations"

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
  const [postSelectedFile, setPostSelectedFile] = useState(null)
  const [postPreviewImage, setPostPreviewImage] = useState(null)

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

  // State for mention feature
  const [mentionQuery, setMentionQuery] = useState("")
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)

  const debouncedMentionSearchTerm = useDebounce(mentionQuery, 300)

  // Refs
  const postFileInputRef = useRef(null)
  const emojiPickerRef = useRef(null)
  const emojiButtonRef = useRef(null)
  const postInputRef = useRef(null)
  const suggestionBoxRef = useRef(null)

  // Hooks
  const { authUser } = useAuthUser()
  const { createPost, isPending, isError, error } = useCreatePosts()
  const { createVentPost, isCreatingVentPost } = useCreateVentPost()
  const [isAnonymous, setIsAnonymous] = useState(false)

  const isMobile = useIsMobile()

  // Fetch mention suggestions using react-query
  const { suggestedUsers, isLoadingSuggestedUsers } = useSearchUsers(debouncedMentionSearchTerm)
  const { markFeedAsRead } = useMarkPostsAsRead()
  const { markVentFeedAsRead } = useMarkVentPostsAsRead()
  const { markICPostsAsRead } = useMarkICPostsAsRead()

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

  // Effect to close mention suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showMentionSuggestions &&
        suggestionBoxRef.current &&
        !suggestionBoxRef.current.contains(event.target) &&
        postInputRef.current &&
        !postInputRef.current.contains(event.target)
      ) {
        setShowMentionSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showMentionSuggestions])

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
    setPostSelectedFile(null)
    setPostPreviewImage(null)
    setShowPollInputs(false)
    setPollChoices([{ text: "" }, { text: "" }])
    setScheduledAt(null)
    setShowEmojiPicker(false)
    setMentionQuery("")
    setShowMentionSuggestions(false)
    setMentionStartIndex(-1)
    if (postFileInputRef.current) {
      postFileInputRef.current.value = null
    }
    if (postInputRef.current) {
      postInputRef.current.style.height = "auto"
    }
  }, [])

  const handleNewPostsButtonClick = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })

    if (feedType === "venting") {
      // New check
      queryClient.invalidateQueries({ queryKey: postKeys.list("/api/posts/vent") })
      // TODO: Create and use a useMarkVentsAsRead hook
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
    setSelectedFile: setPostSelectedFile,
    setPreviewImage: setPostPreviewImage,
    postFileInputRef: postFileInputRef,
  })

  const {
    showEmojiPickerPopover,
    popoverPosition,
    handleOpenEmojiPickerPopover,
    handleCloseEmojiPickerPopover,
  } = useEmojiPickerPopover()

  const handleTextChange = useCallback((e) => {
    const newText = e.target.value
    setPostInput(newText)

    if (postInputRef.current) {
      postInputRef.current.style.height = "auto"
      postInputRef.current.style.height = postInputRef.current.scrollHeight + "px"
    }

    const cursorPosition = e.target.selectionStart
    const textBeforeCursor = newText.substring(0, cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf("@")

    // Logic for mention suggestions
    if (
      lastAtIndex !== -1 &&
      (lastAtIndex === 0 || /\s/.test(textBeforeCursor[lastAtIndex - 1])) // Ensures '@' is preceded by whitespace or start of string
    ) {
      const possibleMention = textBeforeCursor.substring(lastAtIndex)
      const mentionMatch = possibleMention.match(/^@([\p{L}\p{N}_]*)$/u)

      if (mentionMatch) {
        setMentionQuery(mentionMatch[1])
        setMentionStartIndex(lastAtIndex)
        setShowMentionSuggestions(true)
        return
      }
    }

    setMentionQuery("")
    setMentionStartIndex(-1)
    setShowMentionSuggestions(false)
  }, [])

  const handleMentionSelect = useCallback(
    (username) => {
      const currentText = postInput
      const startReplaceIndex = mentionStartIndex

      const textFromAt = currentText.substring(mentionStartIndex)
      const match = textFromAt.match(/^@([\p{L}\p{N}_]*)/u)
      let partialMentionLength = 0
      if (match && match[1]) {
        partialMentionLength = match[1].length
      }

      const endReplaceIndex = mentionStartIndex + 1 + partialMentionLength

      const newText =
        currentText.substring(0, startReplaceIndex) +
        `@${username} ` +
        currentText.substring(endReplaceIndex)

      setPostInput(newText)
      setMentionQuery("")
      setMentionStartIndex(-1)
      setShowMentionSuggestions(false)

      const newCursorPosition = startReplaceIndex + `@${username} `.length
      setTimeout(() => {
        if (postInputRef.current) {
          postInputRef.current.focus()
          postInputRef.current.setSelectionRange(newCursorPosition, newCursorPosition)
          postInputRef.current.style.height = "auto"
          postInputRef.current.style.height = postInputRef.current.scrollHeight + "px"
        }
      }, 0)
    },
    [postInput, mentionStartIndex],
  )

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()

      if (postInput.trim() === "" && !postSelectedFile && !showPollInputs) return
      if (isCreatingVentPost || isPending) return

      // --- 1. Prepare postData ---
      let postData = {
        text: postInput,
        isIC: feedType === "ic",
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
      else if (postSelectedFile) {
        try {
          const base64File = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(postSelectedFile)
          })

          if (postSelectedFile.type.startsWith("image/")) {
            postData.img = base64File
          } else if (postSelectedFile.type.startsWith("video/")) {
            postData.video = base64File
          }
        } catch (err) {
          showAppToast("Failed to read file. Please try again.", "error")
          return
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
      postSelectedFile,
      showPollInputs,
      pollChoices,
      scheduledAt,
      createPost,
      resetForm,
      isPending,
    ],
  )

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        showAppToast("Unsupported file type. Please select an image or a video.", "error")
        setPostSelectedFile(null)
        setPostPreviewImage(null)
        if (postFileInputRef.current) postFileInputRef.current.value = null
        return
      }

      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        showAppToast(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit.`, "error")
        setPostSelectedFile(null)
        setPostPreviewImage(null)
        if (postFileInputRef.current) postFileInputRef.current.value = null
        return
      }

      if (file.type.startsWith("video/")) {
        const videoElement = document.createElement("video")
        videoElement.preload = "metadata"

        videoElement.onloadedmetadata = () => {
          window.URL.revokeObjectURL(videoElement.src)
          if (videoElement.duration > 30) {
            showAppToast("Video duration cannot exceed 30 seconds.", "error")
            setPostSelectedFile(null)
            setPostPreviewImage(null)
            if (postFileInputRef.current) postFileInputRef.current.value = null
            return
          }
          setPostSelectedFile(file)
          setPostPreviewImage(URL.createObjectURL(file))
        }

        videoElement.src = URL.createObjectURL(file)
      } else {
        // ✅ THIS BRANCH WAS MISSING
        setPostSelectedFile(file)
        setPostPreviewImage(URL.createObjectURL(file))
      }

      // Reset conflicting states
      setShowPollInputs(false)
      setPollChoices([{ text: "" }, { text: "" }])
      setShowMentionSuggestions(false)
      setScheduledAt(null)
    } else {
      setPostSelectedFile(null)
      setPostPreviewImage(null)
    }
  }, [])

  const onEmojiClick = useCallback((emojiObject) => {
    setPostInput((prevText) => prevText + emojiObject.emoji)
    postInputRef.current.focus()
  }, [])

  const handleKeyDown = (e) => {
    if (isMobile) {
      return
    }
    if (e.key === "Enter") {
      if (!e.shiftKey) {
        e.preventDefault()
        handleSubmit(e)
      }
    }
  }

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
      setPostSelectedFile(null)
      setPostPreviewImage(null)
      if (postFileInputRef.current) postFileInputRef.current.value = null
      setScheduledAt(null)
      setPollChoices([{ text: "" }, { text: "" }])
      setMentionQuery("")
      setShowMentionSuggestions(false)
      setMentionStartIndex(-1)
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
    setPostSelectedFile(null)
    setPostPreviewImage(null)
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
        return postInput.trim() === "" || postSelectedFile !== null || showPollInputs
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
      return postInput.trim() === "" && !postSelectedFile
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
          <div className="avatar">
            <div className="w-10 rounded-full">
              <img src="/avatar-placeholder.png" alt="Anonymous Avatar" />
            </div>
          </div>
        ) : (
          <Link to={`/profile/${authUser.username}`}>
            <div className={`avatar ${scheduledAt ? "mt-1" : ""}`}>
              <div className="w-10 rounded-full">
                <img
                  src={getOptimizedImageUrl(
                    authUser?.profileImg?.imageUrl || "/avatar-placeholder.png",
                    "avatar",
                  )}
                />
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
            {/* Mention Suggestions Popover */}
            {showMentionSuggestions && suggestedUsers?.length > 0 && !showPollInputs && (
              <div
                ref={suggestionBoxRef}
                className="absolute z-50 max-h-60 w-full overflow-y-auto rounded-md border border-accent bg-base-100 shadow-lg"
                style={{ top: postInputRef.current?.scrollHeight || 0, left: 0 }}
              >
                {isLoadingSuggestedUsers ? (
                  <p className="p-2 text-slate-400">Loading suggestions...</p>
                ) : suggestedUsers.length === 0 ? (
                  <p className="p-2 text-slate-500">No users found.</p>
                ) : (
                  suggestedUsers.map((user) => (
                    <div
                      key={user._id}
                      className="flex cursor-pointer items-center gap-2 p-2 hover:bg-secondary"
                      onClick={() => handleMentionSelect(user.username)}
                    >
                      <div className="avatar">
                        <div className="w-8 rounded-full">
                          <img
                            src={getOptimizedImageUrl(
                              user.profileImg?.imageUrl || "/avatar-placeholder.png",
                              "avatar",
                            )}
                            alt="profile"
                          />
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold">{user.fullName}</p>
                        <p className="text-sm text-slate-500">@{user.username}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {postPreviewImage && (
            <div className="relative mx-auto max-w-full sm:w-auto">
              <IoClose
                size={25}
                className="absolute -right-2 -top-2 z-10 cursor-pointer rounded-full bg-slate-500 p-1 text-white transition duration-200 hover:bg-gray-600"
                onClick={() => {
                  setPostSelectedFile(null)
                  setPostPreviewImage(null)
                  if (postFileInputRef.current) postFileInputRef.current.value = null
                }}
              />
              {postSelectedFile.type.startsWith("image/") ? (
                <img
                  src={postPreviewImage}
                  className="h-auto max-h-96 w-full rounded object-contain"
                  alt="Image preview"
                />
              ) : (
                <video
                  controls
                  src={postPreviewImage}
                  className="h-auto max-h-96 w-full rounded object-contain"
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>
              )}
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
                {!showPollInputs && !scheduledAt && (
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

                {/* Poll icon - hidden if media or schedule is selected/previewed */}
                {!postSelectedFile && !scheduledAt && (
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
                {!postSelectedFile && !showPollInputs && (
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
                  {!showPollInputs && !scheduledAt && (
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

                  {!postSelectedFile && !scheduledAt && (
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
              {postLength > 0 && postSelectedFile === null && !showPollInputs && (
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
                className="rounded-full bg-primary px-3 py-1 font-bold text-white transition duration-300 hover:bg-primary/80 disabled:cursor-default disabled:bg-slate-500 disabled:text-black md:px-4 md:py-2"
                // --- MODIFIED: Update disabled logic ---
                disabled={
                  (feedType === "venting" ? isCreatingVentPost : isPending) || isButtonDisabled
                }
              >
                {/* --- MODIFIED: Update button text logic --- */}
                {feedType === "venting" ? (
                  isCreatingVentPost ? (
                    <LoadingSpinner size="xs" />
                  ) : (
                    "Post"
                  )
                ) : isPending ? (
                  <LoadingSpinner size="xs" />
                ) : scheduledAt ? (
                  "Schedule"
                ) : (
                  "Post"
                )}
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
