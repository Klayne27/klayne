import { useState, useEffect, useRef } from "react"
import ReactDOM from "react-dom"
import { FaCalendar } from "react-icons/fa6"

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

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay()
  }

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear)
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear)
    const days = []

    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    return days
  }

  const handleDateSelect = (day) => {
    if (day) {
      const newDate = new Date(currentYear, currentMonth, day)
      onDateChange(newDate)
      onToggle(false)
    }
  }

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

  const isToday = (day) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    )
  }

  const isSelected = (day) => {
    if (!selectedDate || !day) return false
    const selected = new Date(selectedDate)
    return (
      day === selected.getDate() &&
      currentMonth === selected.getMonth() &&
      currentYear === selected.getFullYear()
    )
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      event.stopPropagation()
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

  useEffect(() => {
    if (selectedDate) {
      const date = new Date(selectedDate)
      setCurrentMonth(date.getMonth())
      setCurrentYear(date.getFullYear())
    }
  }, [selectedDate])

  const calendarDays = generateCalendarDays()

  let portalRoot = document.getElementById("date-picker-portal-root")
  if (!portalRoot) {
    portalRoot = document.createElement("div")
    portalRoot.setAttribute("id", "date-picker-portal-root")
    document.body.appendChild(portalRoot)
  }

  return (
    <>
      <button
        ref={datePickerRef}
        type="button"
        onClick={() => onToggle(!isOpen)}
        onMouseDown={(e) => e.preventDefault()}
        className={`flex items-center gap-2 rounded-lg border border-slate-400 px-2 py-1 text-sm text-slate-400 transition duration-200 focus:outline-none md:hover:bg-slate-700/50  ${className}`}
      >
        <FaCalendar />
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

      {isOpen &&
        ReactDOM.createPortal(
          <div
            ref={calendarRef}
            className="white-shadow fixed left-10 top-20 z-[1001] mt-2 h-auto w-72 rounded-xl bg-base-100 p-4"
          >
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigateMonth("prev")}
                onMouseDown={(e) => e.preventDefault()}
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

            <div className="mb-2 grid grid-cols-7 gap-1">
              {daysOfWeek.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={!day}
                  className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                    !day
                      ? "cursor-default text-gray-400 dark:text-gray-600"
                      : isSelected(day)
                        ? "bg-primary text-white hover:bg-blue-600"
                        : isToday(day)
                          ? "bg-primary/20 text-primary hover:bg-blue-200 focus:bg-blue-200"
                          : "text-slate-600 hover:bg-gray-300"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  onDateChange(null)
                  onToggle(false)
                }}
                onMouseDown={(e) => e.preventDefault()}
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
                className="rounded-lg px-3 py-2 text-sm text-primary hover:bg-primary/20"
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
