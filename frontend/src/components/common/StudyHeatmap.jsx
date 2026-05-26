// src/components/common/StudyHeatmap.jsx
import { useState } from "react"
import ReactCalendarHeatmap from "react-calendar-heatmap"
import { Tooltip } from "react-tooltip"
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6"
import { BiHealth } from "react-icons/bi"

const formatStudyTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

const formatHeatmapDate = (dateString) => {
  if (!dateString) return ""
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(date)
}

// Build a full year's worth of date strings so empty days show as blank squares
const getDatesInYear = (year) => {
  const dates = []
  // Create the date and set to noon to prevent timezone shifts
  const start = new Date(year, 0, 1, 12, 0, 0)
  const end = new Date(year, 11, 31, 12, 0, 0)

  let curr = new Date(start)
  while (curr <= end) {
    dates.push(curr.toISOString().split("T")[0])
    curr.setDate(curr.getDate() + 1)
  }
  return dates
}
const StudyHeatmap = ({ studyHistory = [], joinedAt }) => {
  const joinYear = joinedAt ? new Date(joinedAt).getFullYear() : new Date().getFullYear()
  const currentYear = new Date().getFullYear()

  const [selectedYear, setSelectedYear] = useState(currentYear)

  const canGoBack = selectedYear > joinYear
  const canGoForward = selectedYear < currentYear

  const allDatesInYear = getDatesInYear(selectedYear)

  const heatmapData = allDatesInYear.map((dateStr) => {
    const entry = studyHistory.find((item) => item.date === dateStr)
    return {
      date: dateStr,
      count: entry?.count ?? 0,
      duration: entry?.duration ?? 0,
    }
  })

  // Compute year total for the subtitle
  const yearTotal = heatmapData.reduce((sum, d) => sum + d.duration, 0)
  const yearSessions = heatmapData.reduce((sum, d) => sum + d.count, 0)



  return (
    <div className="flex flex-col gap-2">
      {/* Header row */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {/* Year pagination */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-2">
              <BiHealth className="text-primary" size={18} />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Study Activity
              </h3>
            </div>
            <button
              onClick={() => setSelectedYear((y) => y - 1)}
              disabled={!canGoBack}
              className="flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-base-300 disabled:cursor-default disabled:opacity-20"
            >
              <FaChevronLeft size={10} />
            </button>

            <span className="min-w-[36px] text-center text-sm font-bold text-base-content/70">
              {selectedYear}
            </span>

            <button
              onClick={() => setSelectedYear((y) => y + 1)}
              disabled={!canGoForward}
              className="flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-base-300 disabled:cursor-default disabled:opacity-20"
            >
              <FaChevronRight size={10} />
            </button>
          </div>
        </div>

        {/* Year stats */}
        <div className="flex gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-500">Sessions</span>
            <span className="text-sm font-bold">{yearSessions}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-500">Study Time</span>
            <span className="text-sm font-bold">{formatStudyTime(yearTotal)}</span>
          </div>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[500px]">
          <ReactCalendarHeatmap
            startDate={new Date(selectedYear, 0, 0)}
            endDate={new Date(selectedYear, 11, 31)}
            values={heatmapData}
            gutterSize={3}
            classForValue={(value) => {
              if (!value || !value.count) return "color-empty"
              return `color-scale-${Math.min(Math.ceil(value.count / 2), 4)}`
            }}
            tooltipDataAttrs={(value) => {
              const formattedDate = value?.date ? formatHeatmapDate(value.date) : "Unknown date"
              if (!value || !value.count) {
                return {
                  "data-tooltip-id": "study-tooltip",
                  "data-tooltip-content": `${formattedDate}: No activity recorded`,
                }
              }
              const timeLabel = formatStudyTime(value.duration || 0)
              const sessionLabel = value.count === 1 ? "session" : "sessions"
              return {
                "data-tooltip-id": "study-tooltip",
                "data-tooltip-content": `${formattedDate}: ${value.count} ${sessionLabel} (${timeLabel})`,
              }
            }}
          />
          <Tooltip
            id="study-tooltip"
            className="z-50 !opacity-100 shadow-xl"
            style={{
              backgroundColor: "var(--fallback-b2,oklch(var(--b2)))",
              color: "var(--fallback-bc,oklch(var(--bc)))",
              borderRadius: "12px",
              padding: "6px 12px",
            }}
            border="1px solid var(--fallback-b3,oklch(var(--b3)))"
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-end gap-2 px-1">
        <span className="text-[10px] text-slate-500">Less</span>
        <div className="flex items-center gap-1">
          <div className="size-2 rounded-[2px] bg-[#161b22]" />
          <div className="size-2 rounded-[2px] bg-[#1e6334]" />
          <div className="size-2 rounded-[2px] bg-[#27813f]" />
          <div className="size-2 rounded-[2px] bg-[#36ad56]" />
          <div className="size-2 rounded-[2px] bg-[#42e46a]" />
        </div>
        <span className="text-[10px] text-slate-500">More</span>
      </div>
    </div>
  )
}

export default StudyHeatmap
