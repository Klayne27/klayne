import { Link } from "react-router-dom"
import { FaTrophy } from "react-icons/fa6"
import Pagination from "../../../components/common/Pagination"
import UserAvatar from "../../../components/common/UserAvatar"
import UserFullName from "../../../components/common/UserFullname"
import WordleProgressGrid from "./WordleProgressGrid"
import { getNameplateClass } from "../../../utils/getNameplateClass"

const tierClasses = {
  Diamond:
    "bg-gradient-to-br from-cyan-100 via-white to-cyan-400 text-cyan-800 border-cyan-200 shadow-[0_2px_8px_rgba(34,211,238,0.25)]",
  Platinum:
    "bg-gradient-to-br from-blue-50 via-white to-slate-300 text-slate-500 border-blue-100 shadow-[0_2px_8px_rgba(148,163,184,0.2)]",
  Gold: "bg-gradient-to-br from-amber-100 via-yellow-400 to-amber-900 text-amber-950 border-amber-200 shadow-[0_2px_8px_rgba(245,158,11,0.25)]",
  Silver:
    "bg-gradient-to-br from-zinc-300 via-zinc-100 to-zinc-500 text-zinc-600 border-zinc-400 shadow-[0_2px_6px_rgba(113,113,122,0.15)]",
  Bronze:
    "bg-gradient-to-br from-orange-300 via-orange-500 to-amber-700 text-orange-800 border-orange-400 shadow-[0_2px_6px_rgba(249,115,22,0.15)]",
}

const RankDisplay = ({ rank }) => {
  const isPodium = rank <= 3
  const colors = {
    1: "text-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.4)]",
    2: "text-slate-300 drop-shadow-[0_2px_8px_rgba(203,213,225,0.4)]",
    3: "text-amber-700 drop-shadow-[0_2px_8px_rgba(180,83,9,0.3)]",
  }

  return (
    <div className="flex w-9 shrink-0 items-center justify-center font-black italic">
      {isPodium ? (
        <div className="relative flex items-center justify-center">
          <FaTrophy className={`text-2xl ${colors[rank]}`} />
          <span className="absolute top-[3px] text-[10px] font-black text-base-100">{rank}</span>
        </div>
      ) : (
        <span className="text-sm font-bold tracking-tighter opacity-40">#{rank}</span>
      )}
    </div>
  )
}

const WordleLeaderboard = ({
  type,
  leaderboard,
  page,
  totalPages,
  onPageChange,
  isLoading,
  currentUserId,
  minGamesRequired,
  userGamesPlayed,
}) => {
  const MIN = minGamesRequired ?? 5

  const showProgressBanner =
    type === "all-time" && userGamesPlayed !== undefined && userGamesPlayed < MIN

  const gamesLeft = showProgressBanner ? MIN - userGamesPlayed : 0
  const progressPct = showProgressBanner
    ? Math.min(100, Math.round((userGamesPlayed / MIN) * 100))
    : 0

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm font-medium tracking-wide text-base-content/50">
        Loading elite scores...
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* ── Qualification progress banner ──────────────────────────────── */}
      {showProgressBanner && (
        <div className="mx-2 mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:mx-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-wider text-base-content/50">
              Your ranking progress
            </p>
            <span className="text-xs font-black text-primary">
              {userGamesPlayed}&thinsp;/&thinsp;{MIN} games
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-base-300">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <p className="mt-2 text-[11px] text-base-content/50">
            Play{" "}
            <span className="font-black text-base-content">
              {gamesLeft} more {gamesLeft === 1 ? "day" : "days"}
            </span>{" "}
            to appear on the all-time leaderboard.
          </p>
        </div>
      )}

      {/* ── Entry list ─────────────────────────────────────────────────── */}
      {leaderboard.length === 0 ? (
        <div className="py-12 text-center text-sm font-medium tracking-wide text-base-content/50">
          No completed entries found for this bracket.
        </div>
      ) : (
        <ul className="space-y-2.5 px-2 sm:px-4">
          {leaderboard.map((entry) => {
            const isSelf = currentUserId && entry.user?._id === currentUserId

            return (
              <li
                key={`${type}-${entry.rank}-${entry.user?._id}`}
                className={`${getNameplateClass(entry?.user?.equipped?.nameplate)} relative flex items-center gap-3 overflow-hidden rounded-xl border p-3 transition-all duration-200 ease-out ${
                  isSelf
                    ? "z-10 scale-[1.01] border-primary bg-primary/5 shadow-[inset_0_0_12px_rgba(var(--p),0.08)] ring-2 ring-primary/20"
                    : "border-base-300 bg-base-100 hover:border-base-content/20 hover:shadow-sm"
                }`}
              >
                {isSelf && (
                  <div className="absolute bottom-0 left-0 top-0 w-1 rounded-l-xl bg-primary" />
                )}

                <RankDisplay rank={entry.rank} />

                <Link to={`/profile/${entry.user?.username}`} className="group relative shrink-0">
                  <UserAvatar
                    user={entry.user}
                    size="md"
                    className="ring-2 ring-base-300 transition-all group-hover:ring-primary"
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link to={`/profile/${entry.user?.username}`}>
                      <UserFullName
                        user={entry.user}
                        className="truncate text-sm font-extrabold tracking-tight transition-colors hover:text-primary sm:text-base"
                        style={entry.user?.nameColor ? { color: entry.user.nameColor } : undefined}
                      />
                    </Link>
                    {isSelf && (
                      <span className="animate-pulse rounded bg-primary px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary-content shadow-sm">
                        You
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs font-medium text-base-content/50">
                    @{entry.user?.username}
                  </p>
                </div>

                {type === "daily" ? (
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="opacity-90">
                      <WordleProgressGrid guesses={entry.guesses} size="xs" />
                    </div>
                    <div className="min-w-[50px] text-right hidden sm:block">
                      <p className="text-sm font-black tracking-tight text-base-content">
                        {entry.status === "won" ? entry.score : "X"}/6
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="min-w-[75px] shrink-0 text-right">
                    <span
                      className={`inline-flex rounded-md border border-white/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${tierClasses[entry.tier]} ${
                        entry.tier === "Diamond" || entry.tier === "Gold" ? "animate-shimmer" : ""
                      }`}
                    >
                      {entry.tier}
                    </span>
                    <p className="mt-1 text-sm font-black tabular-nums tracking-tight text-base-content">
                      {entry.averageScore}{" "}
                      <span className="text-[10px] font-normal text-base-content/50">avg</span>
                    </p>
                    <p className="text-[10px] font-bold tracking-tight text-base-content/40">
                      {entry.wins}/{entry.gamesPlayed} Wins
                    </p>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-5">
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      </div>
    </div>
  )
}

export default WordleLeaderboard
