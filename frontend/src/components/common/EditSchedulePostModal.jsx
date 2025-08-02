// EditScheduledPostModal.jsx
import React, { useState, useEffect, useRef, useCallback } from "react"
import { MdClose } from "react-icons/md"
import { IoClose, IoTrashOutline } from "react-icons/io5"
import toast from "react-hot-toast"
import { TbCalendarClock } from "react-icons/tb"

// Import your mutation hooks
import { useCreatePosts } from "../../hooks/postsHooks/useCreatePosts"
import { useUpdateScheduledPost } from "../../hooks/postsHooks/useUpdateScheduledPost"
import { useDeleteScheduledPost } from "../../hooks/postsHooks/useDeleteScheduledPost"
import { useAuthUser } from "../../hooks/authHooks/useAuthUser"
import { PiSmiley } from "react-icons/pi"
import EmojiPicker from "emoji-picker-react"
import useLockBodyScroll from "../../hooks/customHooks/useLockBodyScroll"
import { showAppToast } from "../../utils/showAppToast"
import { RxCaretDown } from "react-icons/rx"
import DateTimeSelector from "../ui/DateTimeSelector"
import useDateTimeStore from "../../store/useDateTimeStore"

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

  const handleUpdateConfirm = () => {
    // Re-validate just before confirming to catch last-second changes
    const validationFailed = validateDateTime()
    if (validationFailed) {
      showAppToast("Scheduled time must be at least 1 minute in the future.", "error")
      return
    }

    const newScheduledDateTime = getScheduledDateTime()
    const nowPlusOneMinute = new Date(Date.now() + 60 * 1000)

    if (newScheduledDateTime < nowPlusOneMinute) {
      showAppToast("Scheduled time must be at least 1 minute in the future.", "error")
      return
    }

    updateScheduledPost(
      {
        postId: post._id,
        postData: {
          text: editedText,
          scheduledAt: newScheduledDateTime.toISOString(),
        },
      },
      {
        onSuccess: () => {
          onClose()
        },
      },
    )
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
          <img src={authUser?.profileImg} className="size-8 rounded-full object-cover md:size-10" />
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

        {/* <div className="flex items-center gap-4 p-4 text-sm text-slate-500">
          <TbCalendarClock size={18} />
          Will send on {formattedScheduledTime()}
        </div>

        <div className="px-4">
          <h3 className="mb-1 text-slate-500">Date</h3>
          <div className="grid grid-cols-[4fr_2fr_2fr] gap-3">
            <div className="relative">
              <select
                className="w-full cursor-pointer appearance-none rounded-[4px] border border-slate-500 bg-base-100 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedMonth}
                onChange={(e) => {
                  const newMonth = parseInt(e.target.value)
                  setSelectedMonth(newMonth)
                  const maxDaysInNewMonth = getDaysInMonth(selectedYear, newMonth)
                  if (selectedDay > maxDaysInNewMonth) {
                    setSelectedDay(maxDaysInNewMonth)
                  }
                }}
              >
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                <RxCaretDown size={20} />
              </div>
            </div>
            <div className="relative">
              <select
                className="w-full cursor-pointer appearance-none rounded-[4px] border border-slate-500 bg-base-100 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedDay}
                onChange={(e) => setSelectedDay(parseInt(e.target.value))}
              >
                {days.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                <RxCaretDown size={20} />
              </div>
            </div>
            <div className="relative">
              <select
                className="w-full cursor-pointer appearance-none rounded-[4px] border border-slate-500 bg-base-100 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedYear}
                onChange={(e) => {
                  const newYear = parseInt(e.target.value)
                  setSelectedYear(newYear)
                  const maxDaysInNewMonth = getDaysInMonth(newYear, selectedMonth)
                  if (selectedDay > maxDaysInNewMonth) {
                    setSelectedDay(maxDaysInNewMonth)
                  }
                }}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                <RxCaretDown size={20} />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 py-2">
          <h3 className="text-slate-500">Time</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="relative">
              <select
                className="w-full cursor-pointer appearance-none rounded-[4px] border border-slate-500 bg-base-100 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedHour}
                onChange={(e) => setSelectedHour(parseInt(e.target.value))}
              >
                {hours.map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                <RxCaretDown size={20} />
              </div>
            </div>
            <div className="relative">
              <select
                className="w-full cursor-pointer appearance-none rounded-[4px] border border-slate-500 bg-base-100 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedMinute}
                onChange={(e) => setSelectedMinute(parseInt(e.target.value))}
              >
                {minutes.map((minute) => (
                  <option key={minute} value={minute}>
                    {minute < 10 ? `0${minute}` : minute}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                <RxCaretDown size={20} />
              </div>
            </div>
            <div className="relative">
              <select
                className="w-full cursor-pointer appearance-none rounded-[4px] border border-slate-500 bg-base-100 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedAmPm}
                onChange={(e) => setSelectedAmPm(e.target.value)}
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                <RxCaretDown size={20} />
              </div>
            </div>
          </div>
        </div> */}

        <DateTimeSelector  />

        {/* Timezone Display */}
        <div className="p-4">
          {/* <h3 className="text-slate-500">Time zone</h3>
          <div className="text-xl">{currentTimezone}</div> */}
          {/* Action Buttons */}
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
