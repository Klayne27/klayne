// EditScheduledPostModal.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { MdClose } from "react-icons/md";
import { IoTrashOutline } from "react-icons/io5"; // Added trash icon
import toast from "react-hot-toast";
import { TbCalendarClock } from "react-icons/tb";


// Import your mutation hooks

import { useCreatePosts } from "../../hooks/postsHooks/useCreatePosts";
import { useUpdateScheduledPost } from "../../hooks/postsHooks/useUpdateScheduledPost";
import { useDeleteScheduledPost } from "../../hooks/postsHooks/useDeleteScheduledPost";

const EditScheduledPostModal = ({ isOpen, onClose, post }) => {
  const modalRef = useRef(null);
  const { updateScheduledPost, isPending: isUpdating } = useUpdateScheduledPost();
  const { deleteScheduledPost, isPending: isDeleting } = useDeleteScheduledPost();
  const { createPost, isPending: isPublishing } = useCreatePosts(); // Use createPost for "publish now"

  // Initialize state with post's scheduledAt date
  const initialSchedule = post ? new Date(post.scheduledAt) : new Date();

  const initialMinutes = initialSchedule.getMinutes();
  const roundedInitialMinutes = Math.min(Math.ceil(initialMinutes / 5) * 5, 55);

  const [selectedMonth, setSelectedMonth] = useState(initialSchedule.getMonth());
  const [selectedDay, setSelectedDay] = useState(initialSchedule.getDate());
  const [selectedYear, setSelectedYear] = useState(initialSchedule.getFullYear());
  const [selectedHour, setSelectedHour] = useState(initialSchedule.getHours() % 12 || 12); // 1-12 format
  const [selectedMinute, setSelectedMinute] = useState(roundedInitialMinutes);
  const [selectedAmPm, setSelectedAmPm] = useState(
    initialSchedule.getHours() >= 12 ? "PM" : "AM"
  );
  const [currentTimezone, setCurrentTimezone] = useState("");

  // State for the post's text (can be edited)
  const [editedText, setEditedText] = useState(post?.text || "");

  useEffect(() => {
    if (!post) return; // Don't proceed if post prop is not available yet

    // Re-initialize state if the post prop changes while modal is open
    const newInitialSchedule = new Date(post.scheduledAt);
    const newInitialMinutes = newInitialSchedule.getMinutes();
    const newRoundedInitialMinutes = Math.min(Math.ceil(newInitialMinutes / 5) * 5, 55);

    setSelectedMonth(newInitialSchedule.getMonth());
    setSelectedDay(newInitialSchedule.getDate());
    setSelectedYear(newInitialSchedule.getFullYear());
    setSelectedHour(newInitialSchedule.getHours() % 12 || 12);
    setSelectedMinute(newRoundedInitialMinutes);
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
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

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

    // Call the mutation hook to update the post
    updateScheduledPost(
      {
        postId: post._id,
        updatedData: {
          text: editedText,
          scheduledAt: newScheduledDateTime.toISOString(),
        },
      },
      {
        onSuccess: () => {
          // This toast is handled by the hook, but can add another here if needed
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

  const handlePublishNow = () => {
    if (window.confirm("Are you sure you want to publish this post immediately?")) {
      createPost(
        {
          text: editedText,
          img: post.img, // Assuming scheduled posts retain their media
          video: post.video,
          pollOptions: post.pollOptions, // If polls are part of your post model
          scheduledAt: null, // Clear scheduledAt to publish immediately
        },
        {
          onSuccess: () => {
            // After publishing, delete the original scheduled post
            deleteScheduledPost(post._id, {
              onSuccess: () => {
                onClose();
                toast.success("Post published successfully!");
              },
              onError: (err) => {
                toast.error(
                  `Post published, but failed to delete scheduled entry: ${err.message}`
                );
                onClose(); // Still close the modal
              },
            });
          },
          onError: (err) => {
            toast.error(err.message || "Failed to publish post immediately.");
          },
        }
      );
    }
  };

  const handleBackgroundClick = (e) => {
    e.stopPropagation()
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
        className="bg-base-100 rounded-2xl shadow-lg max-w-xl mx-auto w-full mt-7 flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <button
            className="hover:bg-gray-800 rounded-full p-2 transition duration-200"
            onClick={onClose}
            disabled={isActionDisabled}
          >
            <MdClose className="w-5 h-5 text-white" />
          </button>
          <h2 className="text-xl font-bold text-white">Edit Scheduled Post</h2>
          <button
            className="bg-white text-black font-semibold px-4 py-1.5 rounded-full hover:opacity-90 transition duration-200 text-sm"
            onClick={handleUpdateConfirm}
            disabled={isActionDisabled}
          >
            {isUpdating ? "Updating..." : "Update"}
          </button>
        </div>

        {/* Post Text Editing */}
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3">Post Content</h3>
          <textarea
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-white text-base resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            rows="4"
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            placeholder="What's happening?"
            disabled={isActionDisabled}
          ></textarea>
        </div>

        {/* Scheduled Time Display */}
        <div className="flex items-center gap-2 p-4 text-sm font-semibold text-primary">
          <TbCalendarClock
          className="w-4 h-4" /> Will send on {formattedScheduledTime()}
        </div>

        {/* Date Selection (similar to SchedulePostModal) */}
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3">Date</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="relative">
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-3 text-white text-base appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedMonth}
                onChange={(e) => {
                  const newMonth = parseInt(e.target.value);
                  setSelectedMonth(newMonth);
                  const maxDaysInNewMonth = getDaysInMonth(selectedYear, newMonth);
                  if (selectedDay > maxDaysInNewMonth) {
                    setSelectedDay(maxDaysInNewMonth);
                  }
                }}
                disabled={isActionDisabled}
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
                className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-3 text-white text-base appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedDay}
                onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                disabled={isActionDisabled}
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
                className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-3 text-white text-base appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedYear}
                onChange={(e) => {
                  const newYear = parseInt(e.target.value);
                  setSelectedYear(newYear);
                  const maxDaysInNewMonth = getDaysInMonth(newYear, selectedMonth);
                  if (selectedDay > maxDaysInNewMonth) {
                    setSelectedDay(maxDaysInNewMonth);
                  }
                }}
                disabled={isActionDisabled}
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

        {/* Time Selection (similar to SchedulePostModal) */}
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3">Time</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="relative">
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-3 text-white text-base appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedHour}
                onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                disabled={isActionDisabled}
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
                className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-3 text-white text-base appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedMinute}
                onChange={(e) => setSelectedMinute(parseInt(e.target.value))}
                disabled={isActionDisabled}
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
                className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-3 text-white text-base appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedAmPm}
                onChange={(e) => setSelectedAmPm(e.target.value)}
                disabled={isActionDisabled}
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
          <h3 className="text-lg font-semibold mb-3">Time zone</h3>
          <div className="bg-gray-800 border border-gray-700 rounded-lg py-3 px-3 text-white text-base">
            {currentTimezone}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-6">
            <button
              className="text-red-500 hover:text-red-600 font-semibold flex items-center gap-1.5 transition duration-200"
              onClick={handleDelete}
              disabled={isActionDisabled}
            >
              <IoTrashOutline className="w-5 h-5" />
              {isDeleting ? "Deleting..." : "Delete post"}
            </button>
            <button
              className="bg-primary text-white font-semibold px-4 py-2 rounded-full hover:opacity-90 transition duration-200 text-sm"
              onClick={handlePublishNow}
              disabled={isActionDisabled}
            >
              {isPublishing ? "Publishing..." : "Publish now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditScheduledPostModal;
