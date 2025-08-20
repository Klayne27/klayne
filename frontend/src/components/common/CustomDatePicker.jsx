import React, { useState, useEffect, useRef } from "react"
import ReactDOM from "react-dom"

const CustomDatePicker = ({
  selectedDate,
  onDateChange,
  isOpen,
  onToggle,
  placeholder = "Select date",
  className = "",
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const datePickerRef = useRef(null)
  const calendarRef = useRef(null)

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

  // Get days in month
  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate()
  }

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay()
  }

  // Generate calendar days
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear)
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear)
    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    return days
  }

  // Handle date selection
  const handleDateSelect = (day) => {
    if (day) {
      const newDate = new Date(currentYear, currentMonth, day)
      onDateChange(newDate)
      onToggle(false)
    }
  }

  // Navigate months
  const navigateMonth = (direction) => {
    if (direction === "prev") {
      if (currentMonth === 0) {
        setCurrentMonth(11)
        setCurrentYear(currentYear - 1)
      } else {
        setCurrentMonth(currentMonth - 1)
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0)
        setCurrentYear(currentYear + 1)
      } else {
        setCurrentMonth(currentMonth + 1)
      }
    }
  }

  // Check if date is today
  const isToday = (day) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    )
  }

  // Check if date is selected
  const isSelected = (day) => {
    if (!selectedDate || !day) return false
    const selected = new Date(selectedDate)
    return (
      day === selected.getDate() &&
      currentMonth === selected.getMonth() &&
      currentYear === selected.getFullYear()
    )
  }



  // Handle click outside and recalculate position on resize/scroll
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target) &&
        calendarRef.current &&
        !calendarRef.current.contains(event.target)
      ) {
        onToggle(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)

    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onToggle])

  // Update current month/year when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      const date = new Date(selectedDate)
      setCurrentMonth(date.getMonth())
      setCurrentYear(date.getFullYear())
    }
  }, [selectedDate])

  const calendarDays = generateCalendarDays()

  // Find or create the portal container
  let portalRoot = document.getElementById("date-picker-portal-root")
  if (!portalRoot) {
    portalRoot = document.createElement("div")
    portalRoot.setAttribute("id", "date-picker-portal-root")
    document.body.appendChild(portalRoot)
  }

  return (
    <>
      {/* Input Button */}
      <button
        ref={datePickerRef}
        type="button"
        onClick={() => onToggle(!isOpen)}
        onMouseDown={(e) => e.preventDefault()}
        className={`flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:border-blue-500 hover:bg-gray-50 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 ${className}`}
      >
        <svg
          className="h-4 w-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span>
          {selectedDate
            ? new Date(selectedDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : placeholder}
        </span>
      </button>

      {/* Calendar Dropdown - Rendered using a Portal */}
      {isOpen &&
        ReactDOM.createPortal(
          <div
            ref={calendarRef}
            // Positioning and size adjusted for better UI.
            // `w-80` is a good width for a calendar.
            // `h-auto` allows height to adjust automatically based on content.
            // The `top-full` and `mt-2` positions it below the input field it's attached to.
            // Removed fixed `left-2` to allow for better horizontal centering or positioning.
            // Added `relative` to allow for absolute positioning of its children if needed.
            className="white-shadow absolute top-28 left-2 z-[1001] mt-2 h-auto w-80 rounded-xl bg-base-100 p-4"
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigateMonth("prev")}
                onMouseDown={(e) => e.preventDefault()}
                // Increased padding and size for better touch/click targets.
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                {months[currentMonth]} {currentYear}
              </h3>

              <button
                type="button"
                onClick={() => navigateMonth("next")}
                onMouseDown={(e) => e.preventDefault()}
                // Increased padding and size for better touch/click targets.
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            {/* Days of Week Header */}
            <div className="mb-2 grid grid-cols-7 gap-1">
              {daysOfWeek.map((day) => (
                <div
                  key={day}
                  // `uppercase` makes the weekday labels more distinct.
                  // `tracking-wider` adds a slight letter spacing for readability.
                  className="py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={!day}
                  // `h-8 w-8` is a good standard size for a calendar day button.
                  // The hover/focus states are improved for better user feedback.
                  className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                    !day
                      ? "cursor-default text-gray-400 dark:text-gray-600" // Faded out text for empty days.
                      : isSelected(day)
                        ? "bg-blue-500 text-white hover:bg-blue-600 focus:bg-blue-600"
                        : isToday(day)
                          ? "bg-blue-100 text-blue-600 hover:bg-blue-200 focus:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-400"
                          : "text-gray-700 hover:bg-gray-100 focus:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 dark:focus:bg-gray-700"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>

            {/* Footer Buttons */}
            <div className="mt-4 flex justify-end gap-2">
              {" "}
              {/* `justify-end` aligns buttons to the right, `gap-2` adds space between them. */}
              <button
                type="button"
                onClick={() => {
                  onDateChange(null)
                  onToggle(false)
                }}
                onMouseDown={(e) => e.preventDefault()}
                // Using a more neutral color for the clear button.
                className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  const today = new Date()
                  setCurrentMonth(today.getMonth())
                  setCurrentYear(today.getFullYear())
                  onDateChange(today)
                  onToggle(false)
                }}
                onMouseDown={(e) => e.preventDefault()}
                // The `Today` button is now an accent color to stand out.
                className="rounded-lg px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/50"
              >
                Today
              </button>
            </div>
          </div>,
          portalRoot,
        )}
    </>
  )
}

export default CustomDatePicker