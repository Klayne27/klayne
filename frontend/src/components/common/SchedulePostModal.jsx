// components/common/SchedulePostModal.jsx (Your existing component)
import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { IoClose } from "react-icons/io5";
import { TbCalendarClock } from "react-icons/tb";

const SchedulePostModal = ({
  isOpen,
  onClose,
  onScheduleConfirm,
  initialDate,
  openAllScheduledPosts,
  scheduledAt,
  onRemoveSchedule,
}) => {
  const modalRef = useRef(null);

  const now = new Date();
  const initialSchedule = initialDate
    ? new Date(initialDate)
    : new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now

  const [selectedDate, setSelectedDate] = useState(initialSchedule);
  const [selectedMonth, setSelectedMonth] = useState(initialSchedule.getMonth());
  const [selectedDay, setSelectedDay] = useState(initialSchedule.getDate());
  const [selectedYear, setSelectedYear] = useState(initialSchedule.getFullYear());
  const [selectedHour, setSelectedHour] = useState(initialSchedule.getHours() % 12 || 12); // 1-12 format
  const [selectedMinute, setSelectedMinute] = useState(initialSchedule.getMinutes());

  const [selectedAmPm, setSelectedAmPm] = useState(
    initialSchedule.getHours() >= 12 ? "PM" : "AM"
  );
  const [currentTimezone, setCurrentTimezone] = useState("");

  useEffect(() => {
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
  }, [isOpen]);

  // Update states if initialDate changes (useful when editing a scheduled post)
  useEffect(() => {
    if (initialDate && isOpen) {
      const date = new Date(initialDate);
      setSelectedDate(date);
      setSelectedMonth(date.getMonth());
      setSelectedDay(date.getDate());
      setSelectedYear(date.getFullYear());
      setSelectedHour(date.getHours() % 12 || 12);
      setSelectedMinute(date.getMinutes());
      setSelectedAmPm(date.getHours() >= 12 ? "PM" : "AM");
    }
  }, [initialDate, isOpen]);

  if (!isOpen) return null;

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
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
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const handleConfirm = () => {
    let hour24 = selectedHour;
    if (selectedAmPm === "PM" && selectedHour !== 12) {
      hour24 = selectedHour + 12;
    } else if (selectedAmPm === "AM" && selectedHour === 12) {
      hour24 = 0;
    }

    const scheduledDateTime = new Date(
      selectedYear,
      selectedMonth,
      selectedDay,
      hour24,
      selectedMinute,
      0
    );

    if (scheduledDateTime <= new Date()) {
      toast.info("Please select a future date and time.");
      return;
    }

    onScheduleConfirm(scheduledDateTime.toISOString());
  };

  const resetDate = new Date(now.getTime() + 10 * 60 * 1000);

  const handleResetSchedule = () => {
    setSelectedDate(resetDate);
    setSelectedMonth(resetDate.getMonth());
    setSelectedDay(resetDate.getDate());
    setSelectedYear(resetDate.getFullYear());
    setSelectedHour(resetDate.getHours() % 12 || 12);
    setSelectedMinute(resetDate.getMinutes());
    setSelectedAmPm(resetDate.getHours() >= 12 ? "PM" : "AM");
  };

  const handleBackgroundClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  const formattedScheduledTime = () => {
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
      className="fixed inset-0 bg-gray-700 bg-opacity-70 flex  justify-center z-50 p-4"
      onClick={handleBackgroundClick}
    >
      <div
        ref={modalRef}
        className="bg-base-100 rounded-2xl shadow-lg max-w-xl  max-h-fit mt-7 mx-auto w-full flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between p-2 px-3">
          <div className="flex gap-5 items-center">
            <button
              className="hover:bg-secondary rounded-full p-1 transition duration-200"
              onClick={onClose}
            >
              <IoClose strokeWidth={1} size={24} />
            </button>
            <h2 className="text-xl font-bold">Schedule</h2>
          </div>
          <div className="flex gap-3">
            {scheduledAt && (
              <button
                onClick={() => {
                  handleResetSchedule();
                  onRemoveSchedule();
                }}
                className="font-semibold rounded-full px-3 hover:bg-secondary transition duration-200"
              >
                Clear
              </button>
            )}

            <button
              className="bg-primary text-white font-semibold px-4 py-1.5 rounded-full hover:opacity-80 transition duration-200 text-sm"
              onClick={handleConfirm}
            >
              Confirm
            </button>
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

        <div className="p-4">
          <h3 className=" text-gray-500">Time zone</h3>
          <div className="text-xl">{currentTimezone}</div>
        </div>
        <div className="flex border-t border-accent p-4">
          <p
            className="flex items-center text-sm font-semibold text-primary px-4 cursor-pointer p-1 rounded-full hover:bg-primary/15 transition duration-200"
            onClick={() => {
              openAllScheduledPosts();
            }}
          >
            Scheduled posts
          </p>
        </div>
      </div>

      {/* <ScheduledPostsModal isOpen={openScheduledPosts} onClose={closeScheduledPosts} /> */}
    </div>
  );
};

export default SchedulePostModal;
