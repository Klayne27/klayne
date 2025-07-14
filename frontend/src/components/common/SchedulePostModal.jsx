import React, { useState, useEffect, useRef } from "react";
import { IoCalendarOutline } from "react-icons/io5";
import { MdClose } from "react-icons/md";

const SchedulePostModal = ({ isOpen, onClose, onScheduleConfirm, initialDate }) => {
  const modalRef = useRef(null);

  // Initialize with current date/time + 10 minutes or initialDate if provided
  const now = new Date();
  const initialSchedule = initialDate
    ? new Date(initialDate)
    : new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now

  const [selectedDate, setSelectedDate] = useState(initialSchedule);
  const [selectedMonth, setSelectedMonth] = useState(initialSchedule.getMonth());
  const [selectedDay, setSelectedDay] = useState(initialSchedule.getDate());
  const [selectedYear, setSelectedYear] = useState(initialSchedule.getFullYear());
  const [selectedHour, setSelectedHour] = useState(initialSchedule.getHours() % 12 || 12); // 1-12 format
  const [selectedMinute, setSelectedMinute] = useState(
    Math.ceil(initialSchedule.getMinutes() / 5) * 5
  ); // Round to nearest 5 minutes
  const [selectedAmPm, setSelectedAmPm] = useState(
    initialSchedule.getHours() >= 12 ? "PM" : "AM"
  );
  const [currentTimezone, setCurrentTimezone] = useState("");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"; // Disable background scrolling
      // Set timezone display
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        // Format timezone nicely, e.g., "America/New_York" to "Eastern Time" or "New York"
        // This is a simple conversion, for full names, you'd need a library or map
        const timezoneName = tz.split("/").pop().replace(/_/g, " ") || tz;
        setCurrentTimezone(timezoneName);
      } catch (error) {
        console.error("Could not determine timezone:", error);
        setCurrentTimezone("Local Time");
      }
    } else {
      document.body.style.overflow = "unset"; // Enable background scrolling
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const days = Array.from(
    { length: getDaysInMonth(selectedYear, selectedMonth) },
    (_, i) => i + 1
  );
  const years = Array.from({ length: 10 }, (_, i) => now.getFullYear() + i); // Current year + 9 future years
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
  const hours = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10... 55

  const handleConfirm = () => {
    let hour24 = selectedHour;
    if (selectedAmPm === "PM" && selectedHour !== 12) {
      hour24 = selectedHour + 12;
    } else if (selectedAmPm === "AM" && selectedHour === 12) {
      hour24 = 0; // Midnight 12 AM is 0 hours
    }

    const scheduledDateTime = new Date(
      selectedYear,
      selectedMonth,
      selectedDay,
      hour24,
      selectedMinute,
      0 // Seconds
    );

    // Basic validation: ensure scheduled time is in the future
    if (scheduledDateTime <= new Date()) {
      alert("Please select a future date and time."); // Use a toast in a real app
      return;
    }

    onScheduleConfirm(scheduledDateTime.toISOString()); // Pass ISO string for consistency
  };

  const handleBackgroundClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  const formattedScheduledTime = () => {
    const date = new Date(
      selectedYear,
      selectedMonth,
      selectedDay,
      selectedHour,
      selectedMinute
    );
    let h = selectedHour;
    if (selectedAmPm === "PM" && selectedHour !== 12) h = selectedHour + 12;
    if (selectedAmPm === "AM" && selectedHour === 12) h = 0;

    const formattedDate = new Date(
      selectedYear,
      selectedMonth,
      selectedDay,
      h,
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
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={handleBackgroundClick}
    >
      <div
        ref={modalRef}
        className="bg-base-100 rounded-2xl shadow-lg max-w-md mx-auto w-full flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <button
            className="hover:bg-gray-800 rounded-full p-2 transition duration-200"
            onClick={onClose}
          >
            <MdClose className="w-5 h-5 text-white" />
          </button>
          <h2 className="text-xl font-bold text-white">Schedule</h2>
          <button
            className="bg-white text-black font-semibold px-4 py-1.5 rounded-full hover:opacity-90 transition duration-200 text-sm"
            onClick={handleConfirm}
          >
            Confirm
          </button>
        </div>

        {/* Scheduled Time Display */}
        <div className="flex items-center gap-2 p-4 text-sm font-semibold text-primary">
          <IoCalendarOutline className="w-4 h-4" />
          Will send on {formattedScheduledTime()}
        </div>

        {/* Date Selection */}
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
                  // Adjust day if new month has fewer days than current selected day
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
                className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-3 text-white text-base appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-3 text-white text-base appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedYear}
                onChange={(e) => {
                  const newYear = parseInt(e.target.value);
                  setSelectedYear(newYear);
                  // Adjust day if selected date becomes invalid in February of a leap/non-leap year
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

        {/* Time Selection */}
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3">Time</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="relative">
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-3 text-white text-base appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-3 text-white text-base appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-3 text-white text-base appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
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
          <h3 className="text-lg font-semibold text-white mb-3">Time zone</h3>
          <div className="bg-gray-800 border border-gray-700 rounded-lg py-3 px-3 text-white text-base">
            {currentTimezone}
          </div>
          <p className="text-sm text-primary mt-4 cursor-pointer hover:underline">
            Scheduled posts
          </p>
        </div>
      </div>
    </div>
  );
};

export default SchedulePostModal;
