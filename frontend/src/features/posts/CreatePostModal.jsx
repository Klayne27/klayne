import { useState, useRef, useEffect, useCallback } from "react"
import { Link } from "react-router-dom"
import { IoClose, IoCloseSharp } from "react-icons/io5"
import { BiImageAdd, BiPoll } from "react-icons/bi"
import { PiSmiley } from "react-icons/pi"
import { TbCalendarClock } from "react-icons/tb"
import { FaPlus } from "react-icons/fa"
import { useDebounce } from "../../hooks/customHooks/useDebounce"
import { useAuthUser } from "../auth/authHooks/useAuthUser"
import { useCreatePosts } from "./postsHooks/useCreatePosts"
import { useIsMobile } from "../../hooks/customHooks/useIsMobile"
import { useSearchUsers } from "../../hooks/usersHooks/userSearchUsers"
import { usePasteHandler } from "../../hooks/customHooks/usePasteHandler"
import { showAppToast } from "../../utils/showAppToast"
import SchedulePostModal from "../../components/common/post-scheduler/SchedulePostModal"
import ScheduledPostsModal from "../../components/common/post-scheduler/ScheduledPostsModal"
import EditScheduledPostModal from "../../components/common/post-scheduler/EditSchedulePostModal"
import { useEmojiPickerPopover } from "../../hooks/customHooks/useEmojiPickerPopover"
import EmojiPickerPopover from "../../components/common/EmojiPickerPopover"
import { MAX_FILE_SIZE_MB, MAX_POLL_CHOICES, POLL_CHOICE_MAX_LENGTH } from "../../constants/numberConstants"

function CreatePostModal({ onClose }) {
  // State for post content
  const [postModalInput, setPostModalInput] = useState("")
  const [postModalSelectedFile, setPostModalSelectedFile] = useState(null)
  const [postModalPreviewImage, setPostModalPreviewImage] = useState(null)

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
  const postModalFileInputRef = useRef(null)
  const emojiPickerRef = useRef(null)
  const emojiButtonRef = useRef(null)
  const postModalInputRef = useRef(null)
  const suggestionBoxRef = useRef(null)
  const modalContentRef = useRef(null)

  // Hooks
  const { authUser } = useAuthUser()
  const { createPost, isPending, isError, error } = useCreatePosts()

  const isMobile = useIsMobile()

  // Fetch mention suggestions using react-query
  const { suggestedUsers, isLoadingSuggestedUsers } = useSearchUsers(debouncedMentionSearchTerm)

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
        postModalInputRef.current &&
        !postModalInputRef.current.contains(event.target)
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
    if (postModalInputRef.current) {
      postModalInputRef.current.style.height = "auto"
      postModalInputRef.current.style.height = postModalInputRef.current.scrollHeight + "px"
    }
  }, [postModalInput, showPollInputs]) // Also react to poll input visibility as it changes layout

  // Handlers
  const {
    showEmojiPickerPopover,
    popoverPosition,
    handleOpenEmojiPickerPopover,
    handleCloseEmojiPickerPopover,
  } = useEmojiPickerPopover()


  const resetForm = useCallback(() => {
    setPostModalInput("")
    setPostModalSelectedFile(null)
    setPostModalPreviewImage(null)
    setShowPollInputs(false)
    setPollChoices([{ text: "" }, { text: "" }])
    setScheduledAt(null)
    setShowEmojiPicker(false)
    setMentionQuery("")
    setShowMentionSuggestions(false)
    setMentionStartIndex(-1)
    if (postModalFileInputRef.current) {
      postModalFileInputRef.current.value = null
    }
    if (postModalInputRef.current) {
      postModalInputRef.current.style.height = "auto"
    }
  }, [])

  const handlePaste = usePasteHandler({
    inputRef: postModalInputRef,
    input: postModalInput,
    setInput: setPostModalInput,
    setSelectedFile: setPostModalSelectedFile,
    setPreviewImage: setPostModalPreviewImage,
    fileInputRef: postModalFileInputRef,
  })

  const handleTextChange = useCallback((e) => {
    const newText = e.target.value
    setPostModalInput(newText)

    if (postModalInputRef.current) {
      postModalInputRef.current.style.height = "auto"
      postModalInputRef.current.style.height = postModalInputRef.current.scrollHeight + "px"
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
      const currentText = postModalInput
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

      setPostModalInput(newText)
      setMentionQuery("")
      setMentionStartIndex(-1)
      setShowMentionSuggestions(false)

      const newCursorPosition = startReplaceIndex + `@${username} `.length
      setTimeout(() => {
        if (postModalInputRef.current) {
          postModalInputRef.current.focus()
          postModalInputRef.current.setSelectionRange(newCursorPosition, newCursorPosition)
          postModalInputRef.current.style.height = "auto"
          postModalInputRef.current.style.height = postModalInputRef.current.scrollHeight + "px"
        }
      }, 0)
    },
    [postModalInput, mentionStartIndex],
  )

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      onClose()
      if (isPending) {
        return // Do nothing if a post is already being created
      }

      if (showPollInputs) {
        const filledPollChoices = pollChoices.filter((choice) => choice.text.trim() !== "")

        if (postModalInput.trim() === "") {
          showAppToast("Polls should have a question/text.", "error")
          return
        }

        if (pollChoices[0].text.trim() === "" || pollChoices[1].text.trim() === "") {
          showAppToast("At least the first two poll options must be filled.", "error")
          return
        }

        if (filledPollChoices.some((choice) => choice.text.length > POLL_CHOICE_MAX_LENGTH)) {
          showAppToast(`Poll options cannot exceed ${POLL_CHOICE_MAX_LENGTH} characters.`, "error")
          return
        }

        if (postModalSelectedFile) {
          showAppToast("You cannot post a poll with an image or video.", "error")
          return
        }
        if (scheduledAt) {
          showAppToast("You cannot schedule a poll.", "error")
          return
        }

        let postData = {
          text: postModalInput,
          pollOptions: filledPollChoices.map((c) => ({ text: c.text })),
        }

        createPost(postData, {
          onSuccess: resetForm,
          onError: (err) => {
            showAppToast(err?.message || "Failed to create post with poll.", "error")
          },
        })
        return
      }

      // Regular post (text or media)
      if (postModalInput.trim() === "" && !postModalSelectedFile) {
        // showAppToastt(("Post must have text, an image, or a video.");
        return
      }

      if (postModalSelectedFile && scheduledAt) {
        showAppToast("You cannot schedule a post with media.", "error")
        return
      }

      let postData = { text: postModalInput }

      if (postModalSelectedFile) {
        const reader = new FileReader()
        reader.onloadend = () => {
          if (postModalSelectedFile.type.startsWith("image/")) {
            postData.img = reader.result
          } else if (postModalSelectedFile.type.startsWith("video/")) {
            postData.video = reader.result
          }

          createPost(postData, {
            onSuccess: resetForm,
            onError: (err) => {
              showAppToast(err?.message || "Failed to create post with media.", "error")
            },
          })
        }
        reader.readAsDataURL(postModalSelectedFile)
      } else {
        if (scheduledAt) {
          postData.scheduledAt = scheduledAt
        }

        createPost(postData, {
          onSuccess: () => {
            resetForm()
          },
          onError: (err) => {
            showAppToast(err?.message || "Failed to create post.", "error")
          },
        })
      }
    },
    [
      postModalInput,
      postModalSelectedFile,
      showPollInputs,
      pollChoices,
      scheduledAt,
      createPost,
      resetForm,
      isPending,
      onClose,
    ],
  )

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        showAppToast("Unsupported file type. Please select an image or a video.", "error")
        setPostModalSelectedFile(null)
        setPostModalPreviewImage(null)
        if (postModalFileInputRef.current) postModalFileInputRef.current.value = null
        return
      }

      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        showAppToast(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit.`, "error")
        setPostModalSelectedFile(null)
        setPostModalPreviewImage(null)
        if (postModalFileInputRef.current) postModalFileInputRef.current.value = null
        return
      }

      setPostModalSelectedFile(file)
      setPostModalPreviewImage(URL.createObjectURL(file))

      // Reset conflicting states
      setShowPollInputs(false)
      setPollChoices([{ text: "" }, { text: "" }])
      setShowMentionSuggestions(false)
      setScheduledAt(null) // Clear scheduledAt if media is selected
    } else {
      setPostModalSelectedFile(null)
      setPostModalPreviewImage(null)
    }
  }, [])

  const onEmojiClick = useCallback((emojiObject) => {
    setPostModalInput((prevText) => prevText + emojiObject.emoji)
    if (postModalInputRef.current) {
      postModalInputRef.current.focus()
      // Auto-adjust height after emoji insert
      postModalInputRef.current.style.height = "auto"
      postModalInputRef.current.style.height = postModalInputRef.current.scrollHeight + "px"
    }
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
    if (postModalInputRef.current) {
      postModalInputRef.current.style.height = "auto"
    }
  }, [])

  const handlePollIconClick = useCallback(() => {
    setShowPollInputs((prev) => !prev)
    if (!showPollInputs) {
      // If turning poll inputs ON, clear other conflicting states
      setPostModalSelectedFile(null)
      setPostModalPreviewImage(null)
      if (postModalFileInputRef.current) postModalFileInputRef.current.value = null
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
    setPostModalSelectedFile(null)
    setPostModalPreviewImage(null)
    if (postModalFileInputRef.current) postModalFileInputRef.current.value = null
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

  const handleBackgroundClick = (e) => {
    e.stopPropagation()
    if (modalContentRef.current && !modalContentRef.current.contains(e.target)) {
      onClose()
    }
  }
  // Determine if the post button should be disabled
  const isButtonDisabled =
    isPending ||
    (() => {
      if (scheduledAt) {
        // Scheduled post requires text, and cannot have media or be a poll
        return postModalInput.trim() === "" || postModalSelectedFile !== null || showPollInputs
      }
      if (showPollInputs) {
        // Poll requires text and at least two non-empty choices, and no choice exceeds max length
        return (
          postModalInput.trim() === "" ||
          pollChoices[0].text.trim() === "" ||
          pollChoices[1].text.trim() === "" ||
          pollChoices.some((choice) => choice.text.length > POLL_CHOICE_MAX_LENGTH)
        )
      }
      // Regular post requires text OR a selected file
      return postModalInput.trim() === "" && !postModalSelectedFile
    })()

  // Prevent scrolling the body when the modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 justify-center bg-gray-700 bg-opacity-70 p-4"
      onClick={handleBackgroundClick}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        ref={modalContentRef}
        className={`mx-auto mt-7 flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-base-100 pl-3 pr-7 shadow-lg`}
      >
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-5">
            <button
              className="rounded-full p-1 transition duration-200 hover:bg-secondary"
              onClick={onClose}
            >
              <IoClose strokeWidth={1} size={24} className="" />
            </button>
            <h2 className="text-xl font-bold">Create Post</h2>{" "}
          </div>
        </div>

        <div className="custom-scrollbar flex flex-1 flex-col overflow-y-auto p-4">
          {/* Avatar and Textarea */}
          <div className="flex flex-grow items-start gap-3">
            <Link to={`/profile/${authUser.username}`}>
              <div className={`avatar ${scheduledAt ? "mt-1" : ""}`}>
                <div className="size-10 rounded-full">
                  <img src={authUser?.profileImg?.imageUrl || "/avatar-placeholder.png"} />
                </div>
              </div>
            </Link>
            <div className={`relative flex w-full ${scheduledAt ? "mt-1" : ""}`}>
              <div className="relative w-full">
                {scheduledAt && (
                  <div
                    className="absolute -left-8 -top-4 flex items-center justify-between"
                    onClick={handleOpenSchedulePostModal}
                  >
                    <p className="flex cursor-pointer items-center gap-3 text-xs text-slate-500 hover:underline">
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
                <textarea
                  className="max-h-[2600px] w-full resize-none overflow-y-auto border-none bg-inherit p-0 pb-2 text-xl focus:outline-none"
                  placeholder={showPollInputs ? "Ask a question" : "What is happening?"}
                  value={postModalInput}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  ref={postModalInputRef}
                  rows={4}
                />
                {/* Mention Suggestions Popover */}
                {showMentionSuggestions && suggestedUsers?.length > 0 && !showPollInputs && (
                  <div
                    ref={suggestionBoxRef}
                    className="absolute z-50 max-h-60 w-full overflow-y-auto rounded-md border border-accent bg-base-100 shadow-lg"
                    style={{
                      top: postModalInputRef.current?.scrollHeight || 0,
                      left: 0,
                    }}
                  >
                    {isLoadingSuggestedUsers ? (
                      <p className="p-2 text-gray-400">Loading suggestions...</p>
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
                                src={user.profileImg?.imageUrl || "/avatar-placeholder.png"}
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
                {postModalPreviewImage && (
                  <div className="relative mx-auto max-w-full sm:w-auto">
                    <IoClose
                      size={25}
                      className="absolute -right-2 -top-2 z-10 cursor-pointer rounded-full bg-slate-500 p-1 text-white transition duration-200 hover:bg-slate-600"
                      onClick={() => {
                        setPostModalSelectedFile(null)
                        setPostModalPreviewImage(null)
                        if (postModalFileInputRef.current)
                          postModalFileInputRef.current.value = null
                      }}
                    />
                    {postModalSelectedFile.type.startsWith("image/") ? (
                      <img
                        src={postModalPreviewImage}
                        className="h-auto max-h-96 w-full rounded object-contain"
                        alt="Image preview"
                      />
                    ) : (
                      <video
                        controls
                        src={postModalPreviewImage}
                        className="h-auto max-h-96 w-full rounded object-contain"
                        preload="metadata"
                      >
                        Your browser does not support the video tag.
                      </video>
                    )}
                  </div>
                )}
                {showPollInputs && (
                  <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-accent p-3">
                    {pollChoices.map((choice, index) => (
                      <div key={index} className="relative flex items-center gap-1">
                        <div
                          className={`relative ${
                            pollChoices.length > 3 ? "w-full" : "mr-7 w-full"
                          }`}
                        >
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
                        {index === pollChoices.length - 1 &&
                          pollChoices.length < MAX_POLL_CHOICES && (
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
              </div>
              {isError && <div className="mt-2 text-red-500">{error.message}</div>}
            </div>
          </div>
          <div className="relative flex justify-between pt-3">
            <div className="ml-[52px] flex items-center gap-1">
              {/* Image/Video input - hidden if poll or schedule is active */}
              {!showPollInputs && !scheduledAt && (
                <BiImageAdd
                  className="h-6 w-6 cursor-pointer text-primary hover:text-primary/80"
                  onClick={() => postModalFileInputRef.current.click()}
                  title="Add image or video"
                  aria-label="Add image or video"
                />
              )}
              <input
                type="file"
                accept="image/*,video/*"
                hidden
                ref={postModalFileInputRef}
                onChange={handleFileChange}
              />

              {/* Poll icon - hidden if media or schedule is selected/previewed */}
              {!postModalSelectedFile && !scheduledAt && (
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
              </div>

              {/* Schedule NEW Post icon - hidden if media or poll is active */}
              {!postModalSelectedFile && !showPollInputs && (
                <TbCalendarClock
                  size={22}
                  className="cursor-pointer text-primary hover:text-primary/80"
                  onClick={handleOpenSchedulePostModal} // Changed to open SchedulePostModal
                  title="Schedule post"
                  aria-label="Schedule new post"
                />
              )}
            </div>

            <button
              onClick={handleSubmit}
              className="rounded-full bg-primary px-4 py-2 font-bold text-white transition duration-300 hover:bg-primary/80 disabled:cursor-default disabled:bg-slate-500 disabled:text-black md:px-4 md:py-2"
              disabled={isButtonDisabled}
            >
              {isPending ? "Posting..." : scheduledAt ? "Schedule" : "Post"}
            </button>
          </div>
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
          {/* Schedule Post Modal (for NEW posts) */}
        </div>
      </div>
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
  )
}

export default CreatePostModal
