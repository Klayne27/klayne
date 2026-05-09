import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { RiRadioButtonLine } from "react-icons/ri"
import { useLiveSessions } from "../../../hooks/customHooks/useLiveSessions"
import { useServerTimeOffset } from "../pomodoroHooks/usePomodoroMutations"
import UserAvatar from "../../../components/common/UserAvatar"
import UserFullName from "../../../components/common/UserFullname"
import { getNameplateClass } from "../../../utils/getNameplateClass"

const SESSIONS_PER_PAGE = 10

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDuration = (minutes) => {
  if (!minutes || minutes === 0) return "0h"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// ── Timer Circle ──────────────────────────────────────────────────────────────
export const LiveTimerCircle = ({
  expectedEndTime,
  startTime,
  clockOffset = 0,
  size = 52,
  sessionCount,
}) => {
  const calcRemaining = () => {
    const adjustedNow = Date.now() + clockOffset
    return Math.max(0, Math.floor((expectedEndTime - adjustedNow) / 1000))
  }

  const [remaining, setRemaining] = useState(calcRemaining)

  useEffect(() => {
    const id = setInterval(() => setRemaining(calcRemaining()), 1_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expectedEndTime, clockOffset])

  const total = (expectedEndTime - startTime) / 1000
  const progress = total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const glow = "oklch(var(--p) / 0.5)"

  const mins = String(Math.floor(remaining / 60)).padStart(2, "0")
  const secs = String(remaining % 60).padStart(2, "0")

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Glow blob */}
        <div
          className="absolute inset-1 rounded-full opacity-20 blur-[10px]"
          style={{ backgroundColor: "oklch(var(--p))" }}
        />
        <svg
          className="-rotate-90 overflow-visible"
          style={{ width: size, height: size, filter: `drop-shadow(0 0 6px ${glow})` }}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="6"
            className="stroke-secondary"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className="stroke-primary"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: circumference * (1 - progress),
              transition: "stroke-dashoffset 1s linear",
              filter: `drop-shadow(0 0 4px ${glow})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-[10px] font-black tabular-nums tracking-tighter text-primary">
            {mins}:{secs}
          </span>
        </div>
      </div>
      {/* Session count label */}
      {sessionCount != null && (
        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
          Session {sessionCount + 1}
        </span>
      )}
    </div>
  )
}

// ── Session Card ──────────────────────────────────────────────────────────────
const SessionCard = ({ session, clockOffset }) => {
  const navigate = useNavigate()
  const nameplateClass = getNameplateClass(session?.equipped?.nameplate)

  return (
    <div
      onClick={() => navigate(`/profile/${session?.username}`)}
      className={`group relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border border-accent/20 ${nameplateClass} bg-base-200/40 p-3 transition-all duration-200 hover:border-primary/20 hover:bg-base-200 hover:shadow-lg hover:shadow-primary/5`}
    >
      <div className="relative z-10 flex w-full items-center gap-3">
        <UserAvatar
          user={{ profileImg: session.profileImg, equipped: session.equipped }}
          size="md"
        />

        <div className="min-w-0 flex-1">
          <UserFullName user={session} className="block truncate text-sm font-bold leading-tight" />
          <p className="truncate text-[11px] text-slate-500">@{session?.username}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary">
              Lv {session?.pomodoroLevel ?? 0}
            </span>
            <span className="text-[9px] font-semibold tabular-nums text-slate-500">
              {formatDuration(session?.totalStudyDuration)}
            </span>
            <span className="text-[9px] text-slate-600">·</span>
            <span className="text-[9px] font-semibold tabular-nums text-slate-500">
              {session?.totalSessionsCompleted ?? 0} sessions
            </span>
          </div>
        </div>

        <LiveTimerCircle
          expectedEndTime={session.expectedEndTime}
          startTime={session.startTime}
          clockOffset={clockOffset}
          size={52}
          sessionCount={session.sessionCount}
        />
      </div>
    </div>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────
const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null
  return (
    <div className="mt-6 flex items-center justify-center">
      <div className="flex items-center gap-1 rounded-2xl border border-accent/10 bg-base-200/50 p-1.5 shadow-xl backdrop-blur-md">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          ‹
        </button>
        <span className="px-4 text-xs font-bold text-primary">
          {page} / {totalPages}
        </span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
        >
          ›
        </button>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="flex items-center gap-3 rounded-2xl border border-accent/10 bg-base-200/40 p-3">
    <div className="size-10 animate-pulse rounded-full bg-base-300" />
    <div className="flex-1 space-y-1.5">
      <div className="h-3 w-24 animate-pulse rounded-full bg-base-300" />
      <div className="h-2 w-16 animate-pulse rounded-full bg-base-300" />
      <div className="h-2 w-28 animate-pulse rounded-full bg-base-300" />
    </div>
    <div className="flex flex-col items-center gap-1">
      <div className="size-[52px] animate-pulse rounded-full bg-base-300" />
      <div className="h-2 w-6 animate-pulse rounded-full bg-base-300" />
    </div>
  </div>
)

// ── Main ──────────────────────────────────────────────────────────────────────
const LiveDashboard = () => {
  const { sessions, isLoading, error } = useLiveSessions()
  const clockOffset = useServerTimeOffset()
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [sessions.length])

  const totalPages = Math.max(1, Math.ceil(sessions.length / SESSIONS_PER_PAGE))
  const paginated = sessions.slice((page - 1) * SESSIONS_PER_PAGE, page * SESSIONS_PER_PAGE)

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RiRadioButtonLine className="animate-pulse text-red-500" size={14} />
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">
            Live Now
          </span>
        </div>
        {!isLoading && !error && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
            {sessions.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <p className="py-10 text-center text-sm text-slate-500">Failed to load live sessions.</p>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-accent/20 bg-base-200">
            <RiRadioButtonLine className="text-slate-500" size={22} />
          </div>
          <p className="text-sm font-bold text-slate-400">No one is live right now</p>
          <p className="text-xs text-slate-600">Start a session to be the first!</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {paginated.map((session) => (
              <SessionCard key={session.userId} session={session} clockOffset={clockOffset} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}

export default LiveDashboard
