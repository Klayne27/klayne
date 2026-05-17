import { FaBullseye, FaFire, FaMedal, FaRegStar, FaStar, FaTrophy, FaXmark } from "react-icons/fa6"
import { GiLaurelsTrophy, GiSevenPointedStar } from "react-icons/gi"
import { MdGridOn } from "react-icons/md"
import useLockBodyScroll from "../../../hooks/customHooks/useLockBodyScroll"

const WORDLE_BADGES = [
  {
    id: "wordle-first-try",
    label: "Ace",
    description: "Solve on the first guess",
    icon: FaStar,
    color: "text-amber-300",
    bg: "bg-amber-400/10",
  },
  {
    id: "wordle-sixth-sense",
    label: "Sixth Sense",
    description: "Solve on the sixth guess",
    icon: GiSevenPointedStar,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  {
    id: "wordle-clean-solve",
    label: "Clean Solve",
    description: "Only green and gray tiles",
    icon: FaBullseye,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    id: "wordle-3-streak",
    label: "Spark Streak",
    description: "Win 3 days in a row",
    icon: FaFire,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
  {
    id: "wordle-7-streak",
    label: "Week Sharp",
    description: "Win 7 days in a row",
    icon: FaFire,
    color: "text-red-400",
    bg: "bg-red-400/10",
  },
  {
    id: "wordle-14-streak",
    label: "Fortnight Focus",
    description: "Win 14 days in a row",
    icon: FaFire,
    color: "text-cyan-300",
    bg: "bg-cyan-300/10",
  },
  {
    id: "wordle-10-solves",
    label: "Ten Solves",
    description: "Solve 10 total puzzles",
    icon: MdGridOn,
    color: "text-lime-400",
    bg: "bg-lime-400/10",
  },
  {
    id: "wordle-25-solves",
    label: "Quarter Century",
    description: "Solve 25 total puzzles",
    icon: FaMedal,
    color: "text-slate-300",
    bg: "bg-slate-300/10",
  },
  {
    id: "wordle-50-solves",
    label: "Grid Veteran",
    description: "Solve 50 total puzzles",
    icon: FaTrophy,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
  },
  {
    id: "wordle-100-solves",
    label: "Centurion",
    description: "Solve 100 total puzzles",
    icon: GiLaurelsTrophy,
    color: "text-sky-300",
    bg: "bg-sky-300/10",
  },
]

const StatTile = ({ label, value }) => (
  <div className="rounded-lg bg-base-200 p-3 text-center">
    <p className="text-2xl font-black tabular-nums">{value}</p>
    <p className="mt-1 text-[11px] font-bold uppercase text-base-content/50">{label}</p>
  </div>
)

const WordleStatsModal = ({ isOpen, onClose, stats, isLoading }) => {
  useLockBodyScroll(isOpen)

  if (!isOpen) return null

  const earnedBadgeIds = new Set(stats?.earnedBadges?.map((badge) => badge.id) || [])
  const maxDistributionCount = Math.max(
    1,
    ...(stats?.guessDistribution || []).map((entry) => entry.count),
  )

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/70 px-3  sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-base-300 bg-base-100 p-5 shadow-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">Statistics</h2>
            <p className="text-sm text-base-content/60">Your Wordle record</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 transition hover:bg-base-200">
            <FaXmark className="text-xl" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-base-content/60">Loading stats...</div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2">
              <StatTile label="Played" value={stats?.gamesPlayed || 0} />
              <StatTile label="Win %" value={stats?.winPercentage || 0} />
              <StatTile label="Current" value={stats?.currentStreak || 0} />
              <StatTile label="Max" value={stats?.maxStreak || 0} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <StatTile label="Wins" value={stats?.wins || 0} />
              <StatTile label="Losses" value={stats?.losses || 0} />
            </div>

            <div className="mt-6">
              <h3 className="mb-3 text-sm font-black uppercase text-base-content/60">
                Guess Distribution
              </h3>
              <div className="space-y-2">
                {(stats?.guessDistribution || []).map((entry) => {
                  const width = `${Math.max(8, (entry.count / maxDistributionCount) * 100)}%`
                  return (
                    <div key={entry.guessCount} className="grid grid-cols-[20px_1fr] items-center gap-2">
                      <span className="text-sm font-black">{entry.guessCount}</span>
                      <div className="h-6 rounded bg-base-200">
                        <div
                          className="flex h-full items-center justify-end rounded bg-[#538d4e] px-2 text-xs font-black text-white"
                          style={{ width }}
                        >
                          {entry.count}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="mb-3 text-sm font-black uppercase text-base-content/60">
                Award Badges
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {WORDLE_BADGES.map((badge) => {
                  const Icon = badge.icon
                  const isEarned = earnedBadgeIds.has(badge.id)

                  return (
                    <div
                      key={badge.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 ${
                        isEarned
                          ? "border-base-300 bg-base-100"
                          : "border-base-300/60 bg-base-200/50 opacity-55"
                      }`}
                    >
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-full ${badge.bg}`}
                      >
                        {isEarned ? (
                          <Icon className={`text-xl ${badge.color}`} />
                        ) : (
                          <Icon className="text-xl text-base-content/35" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">{badge.label}</p>
                        <p className="text-xs text-base-content/55">{badge.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default WordleStatsModal
