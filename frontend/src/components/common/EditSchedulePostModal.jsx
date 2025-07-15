// EditScheduledPostModal.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { MdClose } from "react-icons/md";
import { IoClose, IoTrashOutline } from "react-icons/io5";
import toast from "react-hot-toast";
import { TbCalendarClock } from "react-icons/tb";

// Import your mutation hooks
import { useCreatePosts } from "../../hooks/postsHooks/useCreatePosts";
import { useUpdateScheduledPost } from "../../hooks/postsHooks/useUpdateScheduledPost";
import { useDeleteScheduledPost } from "../../hooks/postsHooks/useDeleteScheduledPost";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import { PiSmiley } from "react-icons/pi";
import EmojiPicker from "emoji-picker-react";

const EditScheduledPostModal = ({ isOpen, onClose, post }) => {
  const modalRef = useRef(null);
  const { updateScheduledPost, isPending: isUpdating } = useUpdateScheduledPost();
  const { deleteScheduledPost, isPending: isDeleting } = useDeleteScheduledPost();
  const { createPost, isPending: isPublishing } = useCreatePosts(); // Use createPost for "publish now"

  const { authUser } = useAuthUser();

  const emojiButtonRef = useRef(null);
    const emojiPickerRef = useRef(null)
  const textareaRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Initialize state with post's scheduledAt date
  const initialSchedule = post ? new Date(post.scheduledAt) : new Date();

  const [selectedMonth, setSelectedMonth] = useState(initialSchedule.getMonth());
  const [selectedDay, setSelectedDay] = useState(initialSchedule.getDate());
  const [selectedYear, setSelectedYear] = useState(initialSchedule.getFullYear());
  const [selectedHour, setSelectedHour] = useState(initialSchedule.getHours() % 12 || 12); // 1-12 format
  const [selectedMinute, setSelectedMinute] = useState(initialSchedule.getMinutes()); // Use actual minute
  const [selectedAmPm, setSelectedAmPm] = useState(
    initialSchedule.getHours() >= 12 ? "PM" : "AM"
  );
  const [currentTimezone, setCurrentTimezone] = useState("");

  // State for the post's text (can be edited)
  const [editedText, setEditedText] = useState(post?.text || "");

  const onEmojiClick = useCallback((emojiObject) => {
    setEditedText((prevText) => prevText + emojiObject.emoji);
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Auto-adjust height after emoji insert
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, []);

  useEffect(() => {
    if (!post) return; // Don't proceed if post prop is not available yet

    // Re-initialize state if the post prop changes while modal is open
    const newInitialSchedule = new Date(post.scheduledAt);

    setSelectedMonth(newInitialSchedule.getMonth());
    setSelectedDay(newInitialSchedule.getDate());
    setSelectedYear(newInitialSchedule.getFullYear());
    setSelectedHour(newInitialSchedule.getHours() % 12 || 12);
    setSelectedMinute(newInitialSchedule.getMinutes()); // Use actual minute
    setSelectedAmPm(newInitialSchedule.getHours() >= 12 ? "PM" : "AM");
    setEditedText(post.text || "");

    if (isOpen) {
      document.body.style.overflow = "hidden";
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const timezoneName = tz.split("/").pop().replace(/_/g, " ") || tz;
        setCurrentTimezone(timezoneName);
      } catch (error) {
        console.error("Could not determine timezone:", error);
        setCurrentTimezone("Local Time");
      }
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, post]); // Depend on isOpen and post

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
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  const getDaysInMonth = useCallback(
    (year, month) => new Date(year, month + 1, 0).getDate(),
    []
  );

  const now = new Date(); // Need current date for years array
  const days = Array.from(
    { length: getDaysInMonth(selectedYear, selectedMonth) },
    (_, i) => i + 1
  );
  const years = Array.from({ length: 10 }, (_, i) => now.getFullYear() + i);
  const months = [
    { name: "January", value: 0 },
    { name: "February", value: 1 },
    { name: "March", value: 2 },
    { name: "April", value: 3 },
    { name: "May", value: 4 },
    { name: "June", value: 5 },
    { name: "July", value: 6 },
    { name: "August", value: 7 },
    { name: "September", value: 8 },
    { name: "October", value: 9 },
    { name: "November", value: 10 },
    { name: "December", value: 11 },
  ];
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i); // 0 to 59 minutes

  const handleUpdateConfirm = () => {
    let hour24 = selectedHour;
    if (selectedAmPm === "PM" && selectedHour !== 12) {
      hour24 = selectedHour + 12;
    } else if (selectedAmPm === "AM" && selectedHour === 12) {
      hour24 = 0;
    }

    const newScheduledDateTime = new Date(
      selectedYear,
      selectedMonth,
      selectedDay,
      hour24,
      selectedMinute,
      0
    );

    const nowPlusOneMinute = new Date(Date.now() + 60 * 1000);
    if (newScheduledDateTime < nowPlusOneMinute) {
      toast.error("Scheduled time must be at least 1 minute in the future.");
      return;
    }

    updateScheduledPost(
      {
        postId: post._id,
        postData: {
          // Renamed from updatedData to postData for consistency with hook
          text: editedText,
          scheduledAt: newScheduledDateTime.toISOString(),
          // No img, video, or pollOptions are sent as scheduled posts are text-only
        },
      },
      {
        onSuccess: () => {
          onClose(); // Close modal on success
        },
      }
    );
  };

  const handleDelete = () => {
    deleteScheduledPost(post._id, {
      onSuccess: () => {
        onClose(); // Close modal on success
      },
    });
  };

  const handleBackgroundClick = (e) => {
    e.stopPropagation();
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  const formattedScheduledTime = useCallback(() => {
    let hour24 = selectedHour;
    if (selectedAmPm === "PM" && selectedHour !== 12) {
      hour24 = selectedHour + 12;
    } else if (selectedAmPm === "AM" && selectedHour === 12) {
      hour24 = 0;
    }

    const formattedDate = new Date(
      selectedYear,
      selectedMonth,
      selectedDay,
      hour24,
      selectedMinute
    );
    const options = {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };
    return formattedDate.toLocaleString("en-US", options);
  }, [
    selectedYear,
    selectedMonth,
    selectedDay,
    selectedHour,
    selectedMinute,
    selectedAmPm,
  ]);

  const isActionDisabled = isUpdating || isDeleting || isPublishing;

  if (!isOpen || !post) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-700 bg-opacity-70 flex justify-center z-50 p-4"
      onClick={handleBackgroundClick}
    >
      <div
        ref={modalRef}
        className="bg-base-100 rounded-2xl shadow-lg max-w-xl mx-auto w-full max-h-fit mt-7 flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center gap-5 px-3 py-2 border-b border-gray-700">
          <button
            className="hover:bg-secondary rounded-full p-1 transition duration-200"
            onClick={onClose}
          >
            <IoClose strokeWidth={1} size={24} />
          </button>
          <h2 className="text-xl font-bold ">Edit Scheduled Post</h2>
        </div>

        {/* Post Text Editing */}
        <div className="p-4 border-b border-accent flex gap-3">
          <img
            src={authUser?.profileImg}
            className="size-8 md:size-10 rounded-full object-cover"
          />
          <div className="flex flex-col flex-1">
            <textarea
              className="flex-1 bg-base-100 rounded-lg resize-none focus:outline-none text-xl"
              rows="3"
              value={editedText}
              ref={textareaRef}
              onChange={(e) => setEditedText(e.target.value)}
              placeholder="What's happening?"
              disabled={isActionDisabled}
            ></textarea>
            <div className=" hidden md:block mb-2 relative">
              <PiSmiley
                ref={emojiButtonRef}
                className="text-primary cursor-pointer hidden md:block hover:text-primary/80"
                size={22}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                strokeWidth={10}
                title="Choose an emoji"
                aria-label="Choose an emoji"
              />
              {showEmojiPicker && (
                <div
                  className="absolute z-10 mt-2 top-full -left-28 md:left-0 md:translate-x-0 "
                  ref={emojiPickerRef}
                >
                  <EmojiPicker
                    onEmojiClick={onEmojiClick}
                    theme="dark"
                    lazyLoadEmojis={true}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 text-sm text-gray-500">
          <TbCalendarClock size={18} />
          Will send on {formattedScheduledTime()}
        </div>

        <div className="px-4">
          <h3 className=" text-gray-500 mb-1">Date</h3>
          <div className="grid grid-cols-[4fr_2fr_2fr] gap-3">
            <div className="relative">
              <select
                className="w-full bg-base-100 border rounded-[4px] border-accent py-3 px-3 text-base appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedMonth}
                onChange={(e) => {
                  const newMonth = parseInt(e.target.value);
                  setSelectedMonth(newMonth);
                  const maxDaysInNewMonth = getDaysInMonth(selectedYear, newMonth);
                  if (selectedDay > maxDaysInNewMonth) {
                    setSelectedDay(maxDaysInNewMonth);
                  }
                }}
              >
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </div>
            </div>
            <div className="relative">
              <select
                className="w-full bg-base-100 border rounded-[4px] border-accent py-3 px-3 text-base appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedDay}
                onChange={(e) => setSelectedDay(parseInt(e.target.value))}
              >
                {days.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </div>
            </div>
            <div className="relative">
              <select
                className="w-full bg-base-100 border rounded-[4px] border-accent py-3 px-3 text-base appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedYear}
                onChange={(e) => {
                  const newYear = parseInt(e.target.value);
                  setSelectedYear(newYear);
                  const maxDaysInNewMonth = getDaysInMonth(newYear, selectedMonth);
                  if (selectedDay > maxDaysInNewMonth) {
                    setSelectedDay(maxDaysInNewMonth);
                  }
                }}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 py-2">
          <h3 className=" text-gray-500">Time</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="relative">
              <select
                className="w-full bg-base-100 border rounded-[4px] border-accent py-3 px-3 text-base appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedHour}
                onChange={(e) => setSelectedHour(parseInt(e.target.value))}
              >
                {hours.map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </div>
            </div>
            <div className="relative">
              <select
                className="w-full bg-base-100 border rounded-[4px] border-accent py-3 px-3 text-base appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedMinute}
                onChange={(e) => setSelectedMinute(parseInt(e.target.value))}
              >
                {minutes.map((minute) => (
                  <option key={minute} value={minute}>
                    {minute < 10 ? `0${minute}` : minute}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </div>
            </div>
            <div className="relative">
              <select
                className="w-full bg-base-100 border rounded-[4px] border-accent py-3 px-3 text-base appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedAmPm}
                onChange={(e) => setSelectedAmPm(e.target.value)}
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Timezone Display */}
        <div className="p-4">
          <h3 className=" text-gray-500">Time zone</h3>
          <div className="text-xl">{currentTimezone}</div>
          {/* Action Buttons */}
          <div className="flex justify-end items-center mt-6">
            <button
              className="bg-primary text-white font-semibold px-4 py-2 rounded-full hover:opacity-80 transition duration-200 text-sm"
              onClick={handleUpdateConfirm}
              disabled={isActionDisabled}
            >
              {isPublishing ? "Updating..." : "Update"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditScheduledPostModal;
