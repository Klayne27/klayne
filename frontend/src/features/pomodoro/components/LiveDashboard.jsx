import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { RiRadioButtonLine } from "react-icons/ri"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { useLiveSessions } from "../../../hooks/customHooks/useLiveSessions"
import { useServerTimeOffset } from "../pomodoroHooks/usePomodoroMutations"
import LoadingSpinner from "../../../components/common/LoadingSpinner"
import UserAvatar from "../../../components/common/UserAvatar"
import UserFullName from "../../../components/common/UserFullname"
import { getNameplateClass } from "../../../utils/getNameplateClass"

// ── Bug 1 fix: define PomodoroCountdown ──────────────────────────────────────
const PomodoroCountdown = ({ expectedEndTime, clockOffset = 0, className = "", onExpired }) => {
  const calcRemaining = () => {
    // Bug 4 fix: adjustedNow = Date.now() + offset (server is `offset` ms ahead of client)
    const adjustedNow = Date.now() + clockOffset
    return Math.max(0, Math.floor((expectedEndTime - adjustedNow) / 1000))
  }

  const [remaining, setRemaining] = useState(calcRemaining)
  const onExpiredRef = useRef(onExpired)
  useEffect(() => {
    onExpiredRef.current = onExpired
  }, [onExpired])

  useEffect(() => {
    if (remaining <= 0) {
      onExpiredRef.current?.()
      return
    }

    const id = setInterval(() => {
      const next = calcRemaining()
      setRemaining(next)
      if (next <= 0) {
        clearInterval(id)
        onExpiredRef.current?.()
      }
    }, 1_000)

    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expectedEndTime, clockOffset])

  const mins = String(Math.floor(remaining / 60)).padStart(2, "0")
  const secs = String(remaining % 60).padStart(2, "0")

  return <span className={className}>{`${mins}:${secs}`}</span>
}
// ─────────────────────────────────────────────────────────────────────────────

const SessionCard = ({ session, clockOffset }) => {
  const navigate = useNavigate()

  const nameplateClass = getNameplateClass(session?.equipped?.nameplate)

  return (
    <div
      onClick={() => navigate(`/profile/${session.username}`)}
      /* 
         Added 'relative' so the nameplate can anchor to this div
         Added 'overflow-hidden' so nameplate graphics don't bleed past the rounded corners
      */
      className={`group relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border border-accent/20 ${nameplateClass} bg-base-200/40 p-3 transition hover:bg-base-200`}
    >
      {/* Content stays on top of the nameplate background */}
      <div className="relative z-10 flex w-full items-center gap-3">
        <UserAvatar
          user={{ profileImg: session.profileImg, equipped: session.equipped }}
          size="md"
        />

        <div className="min-w-0 flex-1">
          <UserFullName user={session} className="block truncate text-sm font-bold" />
          <p className="truncate text-xs text-slate-500 opacity-80">@{session.username}</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-1.5 text-primary">
            <RiRadioButtonLine className="animate-pulse" size={10} />
            <span className="text-[10px] font-black uppercase tracking-widest">Live</span>
          </div>
          <PomodoroCountdown
            expectedEndTime={session.expectedEndTime}
            clockOffset={clockOffset}
            className="font-mono text-sm font-bold text-primary"
            onExpired={() => {}}
          />
        </div>
      </div>
    </div>
  )
}

const LiveDashboard = () => {
  const { authUser } = useAuthUser()
  const { sessions, isLoading, error } = useLiveSessions()
  const clockOffset = useServerTimeOffset()

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return <p className="py-10 text-center text-sm text-slate-500">Failed to load live sessions.</p>
  }

  //   const others = sessions.filter((s) => s.userId !== authUser?._id?.toString())

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <RiRadioButtonLine className="animate-pulse text-red-500" size={14} />
        <span className="text-xs font-black uppercase tracking-widest text-slate-400">
          Live Now · {sessions.length}
        </span>
      </div>

      {sessions.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          No one is studying live right now. Be the first!
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map((session) => (
            <SessionCard key={session.userId} session={session} clockOffset={clockOffset} />
          ))}
        </div>
      )}
    </div>
  )
}

export default LiveDashboard
