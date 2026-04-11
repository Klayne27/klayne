import { useState, useEffect, useRef, useCallback } from "react"
import { IoClose } from "react-icons/io5"

import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { PiSmiley } from "react-icons/pi"
import EmojiPicker from "emoji-picker-react"
import useLockBodyScroll from "../../../hooks/customHooks/useLockBodyScroll"
import DateTimeSelector from "../../../components/common/DateTimeSelector"
import useDateTimeStore from "../../../store/useDateTimeStore"
import { useUpdateScheduledPost } from "../postsHooks/usePostsMutations"
import { getOptimizedImageUrl } from "../../../utils/cloudinaryUtils"

const EditScheduledPostModal = ({ isOpen, onClose, post }) => {
  const modalRef = useRef(null)
  const { updateScheduledPost, isPending: isUpdating } = useUpdateScheduledPost()

  const { authUser } = useAuthUser()
  useLockBodyScroll(isOpen)

  const { isOverallPast, getScheduledDateTime, initializeDateTime, validateDateTime } =
    useDateTimeStore()

  const emojiButtonRef = useRef(null)
  const emojiPickerRef = useRef(null)
  const textareaRef = useRef(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const [editedText, setEditedText] = useState(post?.text || "")

  const onEmojiClick = useCallback((emojiObject) => {
    setEditedText((prevText) => prevText + emojiObject.emoji)
    if (textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"
    }
  }, [])

  // Initialize DateTimeStore and set edited text when modal opens or post changes
  useEffect(() => {
    if (isOpen && post) {
      initializeDateTime(post.scheduledAt)
      setEditedText(post.text || "")
    }
    // Body scroll lock (if useLockBodyScroll is not used)
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen, post, initializeDateTime])

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

  const handleUpdateConfirm = () => {
    const newScheduledDateTime = getScheduledDateTime()

    updateScheduledPost({
      postId: post._id,
      postData: {
        text: editedText,
        scheduledAt: newScheduledDateTime.toISOString(),
      },
    })
    onClose()
  }

  const handleBackgroundClick = (e) => {
    e.stopPropagation()
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose()
    }
  }

  if (!isOpen || !post) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-gray-700 bg-opacity-70 p-4 ${isOpen ? "modal-open" : ""}`}
      onClick={handleBackgroundClick}
    >
      <div
        ref={modalRef}
        className="mx-auto mt-7 flex max-h-fit w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-base-100 shadow-lg"
      >
        {/* Modal Header */}
        <div className="flex items-center gap-5 border-b border-slate-500 px-3 py-2">
          <button
            className="rounded-full p-1 transition duration-200 hover:bg-secondary"
            onClick={onClose}
          >
            <IoClose strokeWidth={1} size={24} />
          </button>
          <h2 className="text-xl font-bold">Edit Scheduled Post</h2>
        </div>

        {/* Post Text Editing */}
        <div className="flex gap-3 border-b border-slate-500 p-4">
          <img src={getOptimizedImageUrl(authUser?.profileImg?.imageUrl, "avatar")} className="size-8 rounded-full object-cover md:size-10" />
          <div className="flex flex-1 flex-col">
            <textarea
              className="flex-1 resize-none rounded-lg bg-base-100 text-xl focus:outline-none"
              rows="3"
              value={editedText}
              ref={textareaRef}
              onChange={(e) => setEditedText(e.target.value)}
              placeholder="What's happening?"
              disabled={isUpdating}
            ></textarea>
            <div className="relative mb-2 hidden md:block">
              <PiSmiley
                ref={emojiButtonRef}
                className="hidden cursor-pointer text-primary hover:text-primary/80 md:block"
                size={22}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                strokeWidth={10}
                title="Choose an emoji"
                aria-label="Choose an emoji"
              />
              {showEmojiPicker && (
                <div
                  className="absolute -left-28 top-full z-10 mt-2 md:left-0 md:translate-x-0"
                  ref={emojiPickerRef}
                >
                  <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" lazyLoadEmojis={true} />
                </div>
              )}
            </div>
          </div>
        </div>

        <DateTimeSelector />

        <div className="p-4">
          <div className="flex items-center justify-end">
            <button
              className={`rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition duration-200 ${
                isOverallPast ? "cursor-not-allowed opacity-50" : "hover:opacity-80"
              }`}
              onClick={handleUpdateConfirm}
              disabled={isOverallPast}
            >
              Update
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditScheduledPostModal
