import { Link } from "react-router-dom"
import { FaTrophy } from "react-icons/fa6"
import Pagination from "../../../components/common/Pagination"
import UserAvatar from "../../../components/common/UserAvatar"
import UserFullName from "../../../components/common/UserFullname"
import WordleProgressGrid from "./WordleProgressGrid"
import { getNameplateClass } from "../../../utils/getNameplateClass"

const tierClasses = {
  Diamond: "bg-cyan-400/15 text-cyan-300 border-cyan-300/30",
  Platinum: "bg-slate-300/15 text-slate-200 border-slate-200/30",
  Gold: "bg-amber-400/15 text-amber-300 border-amber-300/30",
  Silver: "bg-zinc-300/15 text-zinc-200 border-zinc-200/30",
  Bronze: "bg-orange-500/15 text-orange-300 border-orange-300/30",
}

const RankNumber = ({ rank }) => (
  <span
    className={`w-8 shrink-0 text-center text-lg font-black italic ${
      rank === 1 ? "text-amber-400" : rank === 2 ? "text-slate-400" : rank === 3 ? "text-yellow-800" : "opacity-30"
    }`}
  >
    {rank}
  </span>
)

const getTrophyColor = (rank) => {
  switch (rank) {
    case 1:
      return "text-amber-400"
    case 2: 
      return "text-slate-400"
    case 3:
      return "text-yellow-800"
    default:
      return ""
  }
}



const WordleLeaderboard = ({
  type,
  leaderboard,
  page,
  totalPages,
  onPageChange,
  isLoading,
}) => {
  if (isLoading) {
    return <div className="py-8 text-center text-base-content/60">Loading leaderboard...</div>
  }

  if (!leaderboard.length) {
    return <div className="py-8 text-center text-base-content/60">No finished games yet.</div>
  }

  return (
    <div>
      <ul className="space-y-3 px-4">
        {leaderboard.map((entry) => (
          <li
            key={`${type}-${entry.rank}-${entry.user?._id}`}
            className={`${getNameplateClass(entry?.user?.equipped.nameplate)} overflow-hidden flex items-center gap-3 rounded-lg border border-base-300 bg-base-100 p-3`}
          >
            <RankNumber rank={entry.rank} />

            <Link to={`/profile/${entry.user?.username}`} className="shrink-0">
              <UserAvatar user={entry.user} size="md" />
            </Link>

            <div className="min-w-0 flex-1">
              <Link to={`/profile/${entry.user?.username}`}>
                <UserFullName
                  user={entry.user}
                  className="truncate text-sm font-bold hover:text-primary sm:text-base"
                  style={entry.user?.nameColor ? { color: entry.user.nameColor } : undefined}
                />
              </Link>
              <p className="truncate text-xs text-base-content/60">@{entry.user?.username}</p>
            </div>

            {type === "daily" ? (
              <div className="flex items-center gap-3">
                <WordleProgressGrid guesses={entry.guesses} size={"xs"} />
                <div className="min-w-[44px] text-right">
                  <p className="text-sm font-black">{entry.status === "won" ? entry.score : "X"}/6</p>
                </div>
              </div>
            ) : (
              <div className="text-right">
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-black ${tierClasses[entry.tier]}`}
                >
                  {entry.tier}
                </span>
                <p className="mt-1 text-sm font-black tabular-nums">{entry.averageScore}</p>
                <p className="text-[11px] text-base-content/60">
                  {entry.wins}/{entry.gamesPlayed} wins
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>

      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  )
}

export default WordleLeaderboard
