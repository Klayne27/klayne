import { useEffect, useState } from "react"
import { FaXmark, FaBullseye, FaFire, FaMedal, FaStar, FaTrophy } from "react-icons/fa6"
import { GiLaurelsTrophy, GiSevenPointedStar } from "react-icons/gi"
import { MdGridOn } from "react-icons/md"
import useLockBodyScroll from "../../../hooks/customHooks/useLockBodyScroll"

const CONGRATS = ["Genius!", "Magnificent!", "Impressive!", "Splendid!", "Great!", "Phew!"]

// Icons + colors for each badge — mirrors WordleStatsModal's WORDLE_BADGES list
const BADGE_META = {
  "wordle-first-try": {
    Icon: FaStar,
    color: "text-amber-300",
    ring: "ring-amber-400/30",
    bg: "bg-amber-400/10",
  },
  "wordle-sixth-sense": {
    Icon: GiSevenPointedStar,
    color: "text-violet-400",
    ring: "ring-violet-400/30",
    bg: "bg-violet-400/10",
  },
  "wordle-clean-solve": {
    Icon: FaBullseye,
    color: "text-emerald-400",
    ring: "ring-emerald-400/30",
    bg: "bg-emerald-400/10",
  },
  "wordle-3-streak": {
    Icon: FaFire,
    color: "text-orange-400",
    ring: "ring-orange-400/30",
    bg: "bg-orange-400/10",
  },
  "wordle-7-streak": {
    Icon: FaFire,
    color: "text-red-400",
    ring: "ring-red-400/30",
    bg: "bg-red-400/10",
  },
  "wordle-14-streak": {
    Icon: FaFire,
    color: "text-cyan-300",
    ring: "ring-cyan-300/30",
    bg: "bg-cyan-300/10",
  },
  "wordle-10-solves": {
    Icon: MdGridOn,
    color: "text-lime-400",
    ring: "ring-lime-400/30",
    bg: "bg-lime-400/10",
  },
  "wordle-25-solves": {
    Icon: FaMedal,
    color: "text-slate-300",
    ring: "ring-slate-300/30",
    bg: "bg-slate-300/10",
  },
  "wordle-50-solves": {
    Icon: FaTrophy,
    color: "text-yellow-400",
    ring: "ring-yellow-400/30",
    bg: "bg-yellow-400/10",
  },
  "wordle-100-solves": {
    Icon: GiLaurelsTrophy,
    color: "text-sky-300",
    ring: "ring-sky-300/30",
    bg: "bg-sky-300/10",
  },
}

const Divider = () => <div className="mx-6 h-px bg-base-300" />

const StatTile = ({ label, value }) => (
  <div className="flex flex-col items-center gap-0.5">
    <span className="text-[2.6rem] font-black tabular-nums leading-none">{value ?? 0}</span>
    <span className="mt-1.5 max-w-[58px] text-center text-[9px] font-bold uppercase leading-tight tracking-wide text-base-content/50">
      {label}
    </span>
  </div>
)

/**
 * WordleResultModal
 *
 * Props:
 *  isOpen      boolean
 *  onClose     () => void
 *  data        { attempt, stats, answer, unlockedBadges }
 *              — exactly what submitWordleGuess returns on success
 */
const WordleResultModal = ({ isOpen, onClose, data }) => {
  // Two-frame enter: opacity + translate
  const [visible, setVisible] = useState(false)
  // Bars animate in after the panel is settled to avoid clipping
  const [barsReady, setBarsReady] = useState(false)

  useLockBodyScroll(isOpen)

  useEffect(() => {
    if (!isOpen) {
      setVisible(false)
      setBarsReady(false)
      return
    }
    // Next frame → trigger CSS transition
    const raf = requestAnimationFrame(() => {
      setVisible(true)
      const t = setTimeout(() => setBarsReady(true), 280)
      return () => clearTimeout(t)
    })
    return () => cancelAnimationFrame(raf)
  }, [isOpen])

  // Keep the DOM alive during the fade-out (visible stays true for ~300ms)
  if (!isOpen && !visible) return null

  const attempt = data?.attempt
  const stats = data?.stats
  const answer = data?.answer
  const newBadges = data?.unlockedBadges ?? []

  const isWon = attempt?.status === "won"
  const guessCount = attempt?.guesses?.length ?? 0
  const headline = isWon ? (CONGRATS[guessCount - 1] ?? "Brilliant!") : "Better luck tomorrow!"

  const maxDist = Math.max(1, ...(stats?.guessDistribution ?? []).map((e) => e.count))

  return (
    // ── Overlay ───────────────────────────────────────────────────────────
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-[999] flex items-center justify-center bg-black/65 px-4 py-6 transition-opacity duration-300 ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      onClick={onClose}
    >
      {/* ── Panel ──────────────────────────────────────────────────────── */}
      <div
        className={`max-h-[95dvh] w-full max-w-[500px] overflow-y-auto rounded-2xl border border-base-300 bg-base-100 pb-4 shadow-2xl transition-all duration-[350ms] ${visible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Congrats / consolation header ──────────────────────────── */}
        <div className="relative pb-5 pt-8 text-center">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4  top-4 rounded-full p-1.5 text-base-content/40 transition hover:bg-base-200 hover:text-base-content"
          >

            <FaXmark size={18} />
          </button>

          {isWon ? (
            <>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#538d4e]">
                Congratulations
              </p>
              <h2 className="mt-2 font-serif text-4xl font-bold">{headline}</h2>
              <p className="mt-2.5 text-sm text-base-content/55">
                Solved in{" "}
                <span className="font-black text-base-content">{guessCount}&thinsp;/&thinsp;6</span>
              </p>
            </>
          ) : (
            <>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-base-content/40">
                Nice try
              </p>
              <h2 className="mt-2 font-serif text-3xl font-bold">{headline}</h2>
              {answer && (
                <p className="mt-3 text-sm text-base-content/55">
                  The word was{" "}
                  <span className="font-black tracking-[0.22em] text-base-content">
                    {answer.toUpperCase()}
                  </span>
                </p>
              )}
            </>
          )}
        </div>

        {/* ── Statistics ─────────────────────────────────────────────── */}
        {stats && (
          <>
            <Divider />
            <div className="px-6 py-5">
              <h3 className="mb-5 text-center text-[10px] font-black uppercase tracking-[0.3em] text-base-content/40">
                Statistics
              </h3>
              <div className="grid grid-cols-4 gap-1">
                <StatTile label="Played" value={stats.gamesPlayed} />
                <StatTile label="Win %" value={stats.winPercentage} />
                <StatTile label="Current Streak" value={stats.currentStreak} />
                <StatTile label="Max Streak" value={stats.maxStreak} />
              </div>
            </div>
          </>
        )}

        {/* ── Newly unlocked badges (only shown when earned this session) */}
        {newBadges.length > 0 && (
          <>
            <Divider />
            <div className="px-6 py-5">
              <h3 className="mb-3 text-center text-[10px] font-black uppercase tracking-[0.3em] text-base-content/40">
                {newBadges.length === 1 ? "Badge Earned" : "Badges Earned"}
              </h3>
              <div className="flex flex-col gap-2">
                {newBadges.map((badge) => {
                  const meta = BADGE_META[badge.id]
                  if (!meta) return null
                  const { Icon, color, ring, bg } = meta
                  return (
                    <div
                      key={badge.id}
                      className={`flex items-center gap-3 rounded-xl border border-base-200 p-3 ${bg}`}
                    >
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-full ${bg} ring-2 ${ring}`}
                      >
                        <Icon className={`text-xl ${color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-black leading-tight">{badge.label}</p>
                        <p className="mt-0.5 text-xs leading-snug text-base-content/50">
                          {badge.description}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
                        New
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* ── Guess distribution ─────────────────────────────────────── */}
        {stats?.guessDistribution && (
          <>
            <Divider />
            <div className="px-6 py-5">
              <h3 className="mb-4 text-center text-[10px] font-black uppercase tracking-[0.3em] text-base-content/40">
                Guess Distribution
              </h3>
              <div className="flex flex-col gap-1.5">
                {stats.guessDistribution.map((entry, i) => {
                  const isCurrentRow = isWon && entry.guessCount === guessCount
                  // Bars always occupy at least 7% so the count label is readable
                  const targetPct = Math.max(7, (entry.count / maxDist) * 100)
                  return (
                    <div key={entry.guessCount} className="flex items-center gap-2">
                      <span
                        className={`w-3 shrink-0 text-right text-sm font-black ${
                          isCurrentRow ? "text-[#538d4e]" : ""
                        }`}
                      >
                        {entry.guessCount}
                      </span>
                      <div className="flex-1">
                        <div
                          className={`flex h-7 items-center justify-end rounded px-2.5 transition-all duration-700 ${
                            isCurrentRow ? "bg-[#538d4e]" : "bg-base-300"
                          }`}
                          style={{
                            // Start at minimum width, expand once barsReady
                            width: barsReady ? `${targetPct}%` : "7%",
                            transitionDelay: barsReady ? `${i * 55}ms` : "0ms",
                          }}
                        >
                          <span className="text-xs font-black text-white">{entry.count}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* ── Done CTA ───────────────────────────────────────────────── */}
        {/* <Divider />
        <div className="px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-[#538d4e] py-3.5 text-sm font-black uppercase tracking-widest text-white transition hover:bg-[#4a7d46] active:scale-[0.98]"
          >
            Done
          </button>
        </div> */}
      </div>
    </div>
  )
}

export default WordleResultModal
