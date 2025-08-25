import { create } from "zustand"

const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate()
}

const useDateTimeStore = create((set, get) => ({
  selectedMonth: 0,
  selectedDay: 1,
  selectedYear: new Date().getFullYear(),
  selectedHour: 12,
  selectedMinute: 0,
  selectedAmPm: "AM",
  currentTimezone: "",

  isPastDate: false,
  isPastTimeOfDay: false,
  isOverallPast: false,

  setSelectedMonth: (month) =>
    set((state) => {
      const maxDaysInNewMonth = getDaysInMonth(state.selectedYear, month)
      const newDay = state.selectedDay > maxDaysInNewMonth ? maxDaysInNewMonth : state.selectedDay // Update state and then immediately call validateDateTime
      const newState = { selectedMonth: month, selectedDay: newDay }
      set(newState)
      get().validateDateTime()
      return newState
    }),
  setSelectedDay: (day) => {
    set({ selectedDay: day })
    get().validateDateTime()
  },
  setSelectedYear: (year) => {
    set((state) => {
      const maxDaysInNewMonth = getDaysInMonth(year, state.selectedMonth)
      const newDay = state.selectedDay > maxDaysInNewMonth ? maxDaysInNewMonth : state.selectedDay
      const newState = { selectedYear: year, selectedDay: newDay }
      set(newState)
      get().validateDateTime()
      return newState
    })
  },
  setSelectedHour: (hour) => {
    set({ selectedHour: hour })
    get().validateDateTime()
  },
  setSelectedMinute: (minute) => {
    set({ selectedMinute: minute })
    get().validateDateTime()
  },
  setSelectedAmPm: (ampm) => {
    set({ selectedAmPm: ampm })
    get().validateDateTime()
  },
  setCurrentTimezone: (timezone) => set({ currentTimezone: timezone }),

  getScheduledDateTime: () => {
    const state = get()
    let hour24 = state.selectedHour
    if (state.selectedAmPm === "PM" && state.selectedHour !== 12) {
      hour24 = state.selectedHour + 12
    } else if (state.selectedAmPm === "AM" && state.selectedHour === 12) {
      hour24 = 0
    }
    return new Date(
      state.selectedYear,
      state.selectedMonth,
      state.selectedDay,
      hour24,
      state.selectedMinute,
      0,
      0,
    )
  },

  initializeDateTime: (initialDate = null) => {
    const now = new Date()
    const initialSchedule = initialDate
      ? new Date(initialDate)
      : new Date(now.getTime() + 10 * 60 * 1000)

    set({
      selectedMonth: initialSchedule.getMonth(),
      selectedDay: initialSchedule.getDate(),
      selectedYear: initialSchedule.getFullYear(),
      selectedHour: initialSchedule.getHours() % 12 || 12,
      selectedMinute: initialSchedule.getMinutes(),
      selectedAmPm: initialSchedule.getHours() >= 12 ? "PM" : "AM",
    })

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const timezoneName = tz.split("/").pop().replace(/_/g, " ") || tz
      set({ currentTimezone: timezoneName })
    } catch (error) {
      console.error("Could not determine timezone:", error)
      set({ currentTimezone: "Local Time" })
    }
    get().validateDateTime()
  },

  validateDateTime: () => {
    const state = get()
    const nowLocal = new Date()
    nowLocal.setSeconds(0)
    nowLocal.setMilliseconds(0)

    const currentYear = nowLocal.getFullYear()
    const currentMonth = nowLocal.getMonth()
    const currentDay = nowLocal.getDate()
    const currentHour = nowLocal.getHours()
    const currentMinute = nowLocal.getMinutes() // 1. Validate Date (Year, Month, Day)

    const tempIsPastDate =
      state.selectedYear < currentYear ||
      (state.selectedYear === currentYear && state.selectedMonth < currentMonth) ||
      (state.selectedYear === currentYear &&
        state.selectedMonth === currentMonth &&
        state.selectedDay < currentDay) // 2. Validate Time (Hour, Minute) - Only if the selected date is TODAY

    let tempIsPastTimeOfDay = false
    if (
      !tempIsPastDate && // Ensure the date itself isn't in the past
      state.selectedYear === currentYear &&
      state.selectedMonth === currentMonth &&
      state.selectedDay === currentDay
    ) {
      let hour24 = state.selectedHour
      if (state.selectedAmPm === "PM" && state.selectedHour !== 12) {
        hour24 = state.selectedHour + 12
      } else if (state.selectedAmPm === "AM" && state.selectedHour === 12) {
        hour24 = 0
      }
      tempIsPastTimeOfDay =
        hour24 < currentHour || (hour24 === currentHour && state.selectedMinute <= currentMinute)
    } // 3. Overall validation

    const combinedScheduledDateTime = get().getScheduledDateTime()
    const tempIsOverallPast = combinedScheduledDateTime <= nowLocal

    set({
      isPastDate: tempIsPastDate,
      isPastTimeOfDay: tempIsPastTimeOfDay,
      isOverallPast: tempIsOverallPast,
    })

    return tempIsOverallPast
  }, // Memoized lists for select options (These could also be static outside the store if preferred)

  getMonths: () => [
    { value: 0, name: "January" },
    { value: 1, name: "February" },
    { value: 2, name: "March" },
    { value: 3, name: "April" },
    { value: 4, name: "May" },
    { value: 5, name: "June" },
    { value: 6, name: "July" },
    { value: 7, name: "August" },
    { value: 8, name: "September" },
    { value: 9, name: "October" },
    { value: 10, name: "November" },
    { value: 11, name: "December" },
  ],
  getYears: () => {
    const currentYear = new Date().getFullYear()
    const yearsArray = []
    for (let i = currentYear; i <= currentYear + 10; i++) {
      yearsArray.push(i)
    }
    return yearsArray
  },
  getDays: () => {
    const state = get()
    const maxDays = getDaysInMonth(state.selectedYear, state.selectedMonth)
    const daysArray = []
    for (let i = 1; i <= maxDays; i++) {
      daysArray.push(i)
    }
    return daysArray
  },
  getHours: () => Array.from({ length: 12 }, (_, i) => i + 1),
  getMinutes: () => Array.from({ length: 60 }, (_, i) => i), // Formatted string for display

  getFormattedScheduledTime: () => {
    const state = get()
    const formattedDate = state.getScheduledDateTime()
    const options = {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
    return formattedDate.toLocaleString("en-US", options)
  },
}))

export default useDateTimeStore
