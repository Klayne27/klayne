// frontend/src/pages/WordlePage.jsx
import { useCallback, useEffect, useRef, useState } from "react"
import { FaArrowLeft, FaChartSimple } from "react-icons/fa6"
import { IoHelpCircleOutline } from "react-icons/io5" // Imported clean help outline icon
import { useNavigate } from "react-router-dom"
import LoadingSpinner from "../components/common/LoadingSpinner"
import WordleBoard from "../features/wordle/components/WordleBoard"
import WordleKeyboard from "../features/wordle/components/WordleKeyboard"
import WordleLeaderboard from "../features/wordle/components/WordleLeaderboard"
import WordleStatsModal from "../features/wordle/components/WordleStatsModal"
import WordleHelpModal from "../features/wordle/components/WordleHelpModal" // Imported Help Modal
import {
  useGetTodayWordle,
  useGetWordleStats,
  useGetWordleAllTimeLeaderboard,
  useGetWordleDailyLeaderboard,
} from "../features/wordle/wordleHooks/useWordleQueries"
import { useSubmitWordleGuess } from "../features/wordle/wordleHooks/useWordleMutations"
import { useWordleStore } from "../store/useWordleStore"
import { showAppToast } from "../utils/showAppToast"
import WordleResultModal from "../features/wordle/components/WordleResultModal"
import { useAuthUser } from "../features/auth/authHooks/useAuthUser"
import { useWordleValidation } from "../hooks/customHooks/useWordleValidation"

const WordlePage = () => {
  const navigate = useNavigate()
  const { authUser } = useAuthUser()
  const [leaderboardPage, setLeaderboardPage] = useState(1)
  const [isStatsOpen, setIsStatsOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [shakeRowKey, setShakeRowKey] = useState(0)
  const [shakeRowIndex, setShakeRowIndex] = useState(null)

  const [revealingRowIndex, setRevealingRowIndex] = useState(null)
  const [revealedTileCount, setRevealedTileCount] = useState(5)

  const [isResultModalOpen, setIsResultModalOpen] = useState(false)
  const [resultData, setResultData] = useState(null)

  const revealTimeoutsRef = useRef([])

  const { currentGuess, addLetter, removeLetter, clearGuess, leaderboardType, setLeaderboardType } =
    useWordleStore()

  const { isValidWord } = useWordleValidation()

  const { wordle, isLoading } = useGetTodayWordle()
  const { stats, isLoading: isStatsLoading } = useGetWordleStats({
    enabled: isStatsOpen || leaderboardType === "all-time",
  })
  const { submitGuess, isSubmittingGuess, invalidateLeaderboard } = useSubmitWordleGuess()

  const dailyLeaderboard = useGetWordleDailyLeaderboard(leaderboardPage, {
    enabled: leaderboardType === "daily",
  })
  const allTimeLeaderboard = useGetWordleAllTimeLeaderboard(leaderboardPage, {
    enabled: leaderboardType === "all-time",
  })

  const activeLeaderboard = leaderboardType === "daily" ? dailyLeaderboard : allTimeLeaderboard

  const guesses = wordle?.attempt?.guesses || []
  const isFinished = wordle?.attempt?.status && wordle.attempt.status !== "in_progress"
  const isRevealing = revealingRowIndex !== null

  const formatWordleDate = (dateString) => {
    if (!dateString) return ""

    const dateObj = new Date(`${dateString}T00:00:00`)

    // Check for invalid date objects
    if (isNaN(dateObj.getTime())) return dateString

    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(dateObj)
  }

  const triggerShake = useCallback(() => {
    const rowToShake = guesses.length
    setShakeRowIndex(rowToShake)
    setShakeRowKey((k) => k + 1)
    setTimeout(() => {
      setShakeRowIndex(null)
    }, 600)
  }, [guesses.length])

  const clearRevealTimers = () => {
    revealTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
    revealTimeoutsRef.current = []
  }

  // ── Replace startRevealAnimation — adds optional onComplete callback ──────────
  const startRevealAnimation = useCallback((rowIndex, onComplete) => {
    clearRevealTimers()
    setRevealingRowIndex(rowIndex)
    setRevealedTileCount(0)

    revealTimeoutsRef.current = [
      ...Array.from({ length: 5 }, (_, index) =>
        window.setTimeout(() => setRevealedTileCount(index + 1), index * 350 + 350),
      ),
      window.setTimeout(() => {
        setRevealingRowIndex(null)
        setRevealedTileCount(5)
        onComplete?.() // ← fires after the last tile flips
      }, 2200),
    ]
  }, [])

  // ── Replace handleSubmit — captures mutation data and opens modal on finish ───
  // In WordlePage.jsx — replace handleSubmit
  const handleSubmit = useCallback(() => {
    if (isFinished || isSubmittingGuess || isRevealing) return

    if (currentGuess.length !== 5) {
      showAppToast("Not enough letters")
      triggerShake()
      return
    }

    // ✅ Validate client-side BEFORE hitting the API
    if (!isValidWord(currentGuess)) {
      showAppToast("Not in word list")
      triggerShake() // instant — no network wait
      return // keyboard stays fully enabled
    }

    const submittedRowIndex = guesses.length
    submitGuess(currentGuess, {
      onSuccess: (data) => {
        clearGuess()
        const gameEnded = data.attempt?.status !== "in_progress"
        startRevealAnimation(submittedRowIndex, () => {
          if (gameEnded && data.stats) {
            invalidateLeaderboard()
            setResultData(data)
            setIsResultModalOpen(true)
          }
        })
      },
      onError: (error) => {
        // Only non-word-list errors reach here now (server errors, already finished, etc.)
        triggerShake()
      },
    })
  }, [
    isFinished,
    isSubmittingGuess,
    isRevealing,
    currentGuess,
    guesses.length,
    isValidWord, // add this
    submitGuess,
    clearGuess,
    startRevealAnimation,
    triggerShake,
    invalidateLeaderboard,
  ])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (isFinished || isSubmittingGuess || isRevealing || isHelpOpen || isStatsOpen) return

      if (event.key === "Enter") {
        handleSubmit()
        return
      }

      if (event.key === "Backspace") {
        removeLetter()
        return
      }

      if (/^[a-zA-Z]$/.test(event.key)) {
        addLetter(event.key.toLowerCase())
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    addLetter,
    currentGuess,
    isFinished,
    isRevealing,
    isSubmittingGuess,
    removeLetter,
    isHelpOpen,
    isStatsOpen,
    handleSubmit,
  ])

  useEffect(() => () => clearRevealTimers(), [])

  const switchLeaderboard = (type) => {
    setLeaderboardType(type)
    setLeaderboardPage(1)
  }

  const userTotalGames = resultData?.stats?.gamesPlayed ?? stats?.gamesPlayed ?? undefined

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="template min-h-screen max-w-3xl border-accent pb-24 pt-3 md:border-x md:pb-8">
      <div className="mb-4 flex items-center border-b border-accent px-4 pb-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-2.5 transition hover:bg-secondary"
        >
          <FaArrowLeft className="text-xl" />
        </button>
        <span className=" p-[22px]"></span>

        <div className="flex-1 text-center">
          <h1 className="font-serif text-3xl font-bold tracking-tight">Wordle</h1>
          <p className="text-xs font-semibold text-base-content/60">
            {formatWordleDate(wordle?.date)}
          </p>
        </div>

        {/* Action Button Controls Wrapper */}
        <div className="flex items-center gap-1">
          {/* NYT Style Info Trigger Button */}
          <button
            onClick={() => setIsHelpOpen(true)}
            className="rounded-full p-2 text-base-content/70 transition hover:bg-secondary hover:text-base-content"
            title="How to Play"
          >
            <IoHelpCircleOutline className="text-2xl" />
          </button>

          <button
            onClick={() => setIsStatsOpen(true)}
            className="rounded-full p-2.5 text-primary transition hover:bg-secondary"
            title="Statistics"
          >
            <FaChartSimple className="text-xl" />
          </button>
        </div>
      </div>

      <section className="py-3">
        <WordleBoard
          guesses={guesses}
          currentGuess={currentGuess}
          shakeRowIndex={shakeRowIndex} //   Switched to the state variable
          shakeRowKey={shakeRowKey}
          revealingRowIndex={revealingRowIndex}
          revealedTileCount={revealedTileCount}
        />

        {isFinished && !isRevealing && (
          <div className="mx-auto mt-4 max-w-[330px] rounded-lg border border-base-300 bg-base-200 p-3 text-center">
            <p className="font-black">
              {wordle.attempt.status === "won"
                ? `Solved in ${wordle.attempt.guesses.length}/6`
                : "Better luck tomorrow"}
            </p>
            <p className="text-sm text-base-content/70">Answer: {wordle.answer?.toUpperCase()}</p>
          </div>
        )}

        <WordleKeyboard
          guesses={guesses}
          disabled={isFinished || isSubmittingGuess || isRevealing}
          isRevealing={isRevealing}
          onLetter={addLetter}
          onBackspace={removeLetter}
          onEnter={handleSubmit}
        />
      </section>

      <section className="mt-8">
        <div className="mb-4 flex border-b border-base-300">
          {[
            ["daily", "Daily"],
            ["all-time", "All-Time"],
          ].map(([type, label]) => (
            <button
              key={type}
              onClick={() => switchLeaderboard(type)}
              className={`relative flex-1 pb-3 text-sm font-bold transition-colors ${
                leaderboardType === type ? "text-primary" : "text-base-content/50"
              }`}
            >
              {label}
              {leaderboardType === type && (
                <span className="absolute bottom-0 left-0 right-0 h-1 rounded-t-full bg-primary" />
              )}
            </button>
          ))}
        </div>

        {leaderboardType === "all-time" && (
          <div className="mx-3 mb-4 rounded-xl border border-base-300 bg-base-200/40 p-4 shadow-inner">
            {/* Subtitle / Context Header */}
            <div className="mb-3 flex flex-col items-center justify-between gap-1 border-b border-base-300 pb-2 sm:flex-row">
              <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40">
                Rank Tier Thresholds
              </span>
              <span className="text-[10px] font-bold text-base-content/50">
                Based on overall average guesses (Lower is better)
              </span>
            </div>

            {/* Responsive Rank Grid */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[
                {
                  tier: "Diamond",
                  range: "1.00 - 3.00",
                  bg: "bg-gradient-to-br from-cyan-100 via-white to-cyan-400 text-cyan-800 shadow-[0_2px_6px_rgba(34,211,238,0.2)]",
                },
                {
                  tier: "Platinum",
                  range: "3.01 - 3.50",
                  bg: "bg-gradient-to-br from-blue-50 via-white to-slate-300 text-slate-500 border-blue-100 shadow-[0_2px_8px_rgba(148,163,184,0.2)]",
                },
                {
                  tier: "Gold",
                  range: "3.51 - 4.00",
                  bg: "bg-gradient-to-br from-amber-100 via-yellow-400 to-amber-500 text-amber-900 shadow-[0_2px_6px_rgba(245,158,11,0.2)]",
                },
                {
                  tier: "Silver",
                  range: "4.01 - 4.50",
                  bg: "bg-gradient-to-br from-zinc-300 via-zinc-100 to-zinc-500 text-zinc-600 border-zinc-400 shadow-[0_2px_6px_rgba(113,113,122,0.15)]",
                },
                {
                  tier: "Bronze",
                  range: "4.51+",
                  bg: "bg-gradient-to-br from-orange-300 via-orange-400 to-amber-700 text-orange-800 shadow-[0_2px_6px_rgba(249,115,22,0.15)]",
                },
              ].map((item) => (
                <div
                  key={item.tier}
                  className="flex flex-col items-center justify-center rounded-lg border border-base-300/60 bg-base-100 p-2 text-center shadow-sm transition-all"
                >
                  {/* Mini-badge item */}
                  <span
                    className={`w-full rounded-md border border-white/20 px-1 py-0.5 text-[9px] font-black uppercase tracking-widest ${item.bg}`}
                  >
                    {item.tier}
                  </span>
                  {/* Range metric display */}
                  <span className="mt-1.5 font-mono text-xs font-bold tracking-tight">
                    {item.range}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <WordleLeaderboard
          type={leaderboardType}
          leaderboard={activeLeaderboard.leaderboard}
          page={leaderboardPage}
          totalPages={activeLeaderboard.totalPages}
          onPageChange={setLeaderboardPage}
          isLoading={activeLeaderboard.isLoading}
          currentUserId={authUser?._id}
          minGamesRequired={
            leaderboardType === "all-time" ? allTimeLeaderboard.minGamesRequired : undefined
          }
          userGamesPlayed={leaderboardType === "all-time" ? userTotalGames : undefined}
        />
      </section>

      {/* Global Statistics Modal */}
      <WordleStatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={stats}
        isLoading={isStatsLoading}
      />

      {/* How To Play Help Modal Overlays */}
      <WordleHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <WordleResultModal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        data={resultData}
      />
    </div>
  )
}

export default WordlePage
