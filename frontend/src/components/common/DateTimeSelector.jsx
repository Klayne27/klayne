import { useEffect } from "react"
import { TbCalendarClock } from "react-icons/tb"
import { RxCaretDown } from "react-icons/rx"
import useDateTimeStore from "../../store/useDateTimeStore"

const DateTimeSelector = () => {
  const {
    selectedMonth,
    selectedDay,
    selectedYear,
    selectedHour,
    selectedMinute,
    selectedAmPm,
    currentTimezone,
    isPastDate,
    isPastTimeOfDay,
    setSelectedMonth,
    setSelectedDay,
    setSelectedYear,
    setSelectedHour,
    setSelectedMinute,
    setSelectedAmPm,
    getMonths,
    getDays,
    getYears,
    getHours,
    getMinutes,
    getFormattedScheduledTime,
    validateDateTime,
  } = useDateTimeStore() 

  useEffect(() => {
    validateDateTime()
  }, [
    selectedMonth,
    selectedDay,
    selectedYear,
    selectedHour,
    selectedMinute,
    selectedAmPm,
    validateDateTime,
  ])

  return (
    <>
      <div className="flex items-center gap-4 p-4 text-sm text-slate-500">
        <TbCalendarClock size={18} />
        Will send on {getFormattedScheduledTime()}
      </div>

      <div className="px-4">
        <h3 className="mb-1 text-slate-500">Date</h3>
        <div className="grid grid-cols-[4fr_2fr_2fr] gap-3">
          <div className="relative">
            <select
              className={`w-full cursor-pointer appearance-none rounded-[4px] border bg-base-100 px-3 py-3 text-base focus:border-none focus:outline-none focus:ring-2 ${
                isPastDate
                  ? "border-red-500 focus:ring-red-500"
                  : "border-slate-500 focus:ring-primary"
              }`}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            >
              {getMonths().map((month) => (
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
              className={`w-full cursor-pointer appearance-none rounded-[4px] border bg-base-100 px-3 py-3 text-base focus:border-none focus:outline-none focus:ring-2 ${
                isPastDate
                  ? "border-red-500 focus:ring-red-500"
                  : "border-slate-500 focus:ring-primary"
              }`}
              value={selectedDay}
              onChange={(e) => setSelectedDay(parseInt(e.target.value))}
            >
              {getDays().map((day) => (
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
              className={`w-full cursor-pointer appearance-none rounded-[4px] border bg-base-100 px-3 py-3 text-base focus:border-none focus:outline-none focus:ring-2 ${
                isPastDate
                  ? "border-red-500 focus:ring-red-500"
                  : "border-slate-500 focus:ring-primary"
              }`}
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {getYears().map((year) => (
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

        {isPastDate && (
          <p className="mt-2 text-sm text-red-500">
            You can't schedule a post to send in the past.
          </p>
        )}
      </div>

      <div className="p-4 py-2">
        <h3 className="text-slate-500">Time</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="relative">
            <select
              className={`w-full cursor-pointer appearance-none rounded-[4px] border bg-base-100 px-3 py-3 text-base focus:border-none focus:outline-none focus:ring-2 ${
                isPastTimeOfDay && !isPastDate
                  ? "border-red-500 focus:ring-red-500"
                  : "border-slate-500 focus:ring-primary"
              }`}
              value={selectedHour}
              onChange={(e) => setSelectedHour(parseInt(e.target.value))}
            >
              {getHours().map((hour) => (
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
              className={`w-full cursor-pointer appearance-none rounded-[4px] border bg-base-100 px-3 py-3 text-base focus:border-none focus:outline-none focus:ring-2 ${
                isPastTimeOfDay && !isPastDate
                  ? "border-red-500 focus:ring-red-500"
                  : "border-slate-500 focus:ring-primary"
              }`}
              value={selectedMinute}
              onChange={(e) => setSelectedMinute(parseInt(e.target.value))}
            >
              {getMinutes().map((minute) => (
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
              className={`w-full cursor-pointer appearance-none rounded-[4px] border bg-base-100 px-3 py-3 text-base focus:border-none focus:outline-none focus:ring-2 ${
                isPastTimeOfDay && !isPastDate
                  ? "border-red-500 focus:ring-red-500"
                  : "border-slate-500 focus:ring-primary"
              }`}
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

        {isPastTimeOfDay && (
          <p className="mt-2 text-sm text-red-500">
            You can't schedule a post to send in the past.
          </p>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-slate-500">Time zone</h3>
        <div className="text-xl">{currentTimezone}</div>
      </div>
    </>
  )
}

export default DateTimeSelector
