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
import { useWordleReveal } from "../hooks/customHooks/useWordleReveal"

const REVEAL_DURATION_MS = 4 * 350 + 2 * 350 + 150 

const WordlePage = () => {
  const navigate = useNavigate()
  const [leaderboardPage, setLeaderboardPage] = useState(1)
  const [isStatsOpen, setIsStatsOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false) // Added help overlay state anchor
  const [shakeRowKey, setShakeRowKey] = useState(0)
  const [revealingRowIndex, setRevealingRowIndex] = useState(null)
  const [revealedTileCount, setRevealedTileCount] = useState(5)

    const [shakeRowIndex, setShakeRowIndex] = useState(null)
  const revealTimeoutsRef = useRef([])
    const cleanupTimerRef = useRef(null)


  const { setCurrentGuess, currentGuess, addLetter, removeLetter, clearGuess, leaderboardType, setLeaderboardType } =
    useWordleStore()

  const { wordle, isLoading } = useGetTodayWordle()
  const { stats, isLoading: isStatsLoading } = useGetWordleStats({ enabled: isStatsOpen })
  const { submitGuess, isSubmittingGuess } = useSubmitWordleGuess()
    const { reveal, beginReveal, commitResult, clearReveal } = useWordleReveal()


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

  const triggerShake = useCallback((rowIndex) => {
    setShakeRowIndex(rowIndex)
    setShakeRowKey((k) => k + 1)
    setTimeout(() => setShakeRowIndex(null), 600)
  }, [])

  const clearRevealTimers = () => {
    revealTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
    revealTimeoutsRef.current = []
  }

  const startRevealAnimation = useCallback((rowIndex) => {
    clearRevealTimers()
    setRevealingRowIndex(rowIndex)
    setRevealedTileCount(0)

    revealTimeoutsRef.current = [
      ...Array.from({ length: 5 }, (_, index) =>
        window.setTimeout(
          () => {
            setRevealedTileCount(index + 1)
          },
          index * 350 + 350,
        ),
      ),
      window.setTimeout(() => {
        setRevealingRowIndex(null)
        setRevealedTileCount(5)
      }, 2200),
    ]
  }, [])

  // const handleSubmit = useCallback(() => {
  //   if (isFinished || isSubmittingGuess || isRevealing) return
  //   if (currentGuess.length !== 5) {
  //     showAppToast("Not enough letters")
  //     triggerShake()
  //     return
  //   }

  //   const submittedRowIndex = guesses.length
  //   submitGuess(currentGuess, {
  //     onSuccess: () => {
  //       clearGuess()
  //       startRevealAnimation(submittedRowIndex)
  //     },
  //     onError: () => {
  //       triggerShake()
  //     },
  //   })
  // }, [
  //   isFinished,
  //   isSubmittingGuess,
  //   isRevealing,
  //   currentGuess,
  //   guesses.length,
  //   submitGuess,
  //   clearGuess,
  //   startRevealAnimation,
  //   triggerShake,
  // ])

   const handleSubmit = useCallback(() => {
     if (isRevealing || isFinished) return

     const guess = currentGuess.toLowerCase()

     if (guess.length < 5) {
       triggerShake(guesses.length)
       showAppToast("Not enough letters", "error")
       return
     }

     const rowIndex = guesses.length

     // ── 1. Clear input and start flip animation IMMEDIATELY ──────────────
     clearGuess()
     beginReveal(rowIndex, guess)

     // Schedule reveal cleanup
     clearTimeout(cleanupTimerRef.current)
     cleanupTimerRef.current = setTimeout(clearReveal, REVEAL_DURATION_MS)
     // ── 2. Fire server request in the background ─────────────────────────
     submitGuess(
        guess ,
       {
         onSuccess: (data) => {
           // As soon as server data arrives, unblock any waiting tiles.
           // Tiles whose midpoint hasn't fired yet will pick up the result
           // from the ref on their own schedule.
           const newGuess = data.attempt.guesses.at(-1)
           commitResult(newGuess.result, rowIndex)
         },
         onError: () => {
           // Server rejected the guess (not in word list, already finished, etc.)
           // Cancel the animation and restore the user's input so they can retry.
           clearTimeout(cleanupTimerRef.current)
           clearReveal()
           setCurrentGuess(guess)
           triggerShake(rowIndex)
         },
       },
     )
   }, [
     isRevealing,
     isFinished,
     currentGuess,
     guesses.length,
     clearGuess,
     beginReveal,
     commitResult,
     clearReveal,
     submitGuess,
     setCurrentGuess,
     triggerShake,
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
          shakeRowIndex={shakeRowIndex}
          shakeRowKey={shakeRowKey}
          reveal={reveal}
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
          isRevealing={isRevealing} // prevents keyboard colors updating mid-animation
          disabled={isRevealing || isFinished}
          onLetter={addLetter}
          onEnter={handleSubmit}
          onBackspace={removeLetter}
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
          <div className="mb-3 rounded-lg bg-base-200 p-3 text-xs font-semibold text-base-content/70">
            Diamond 1.00-2.99 • Platinum 3.00-3.49 • Gold 3.50-3.99 • Silver 4.00-4.49 • Bronze
            4.50+
          </div>
        )}

        <WordleLeaderboard
          type={leaderboardType}
          leaderboard={activeLeaderboard.leaderboard}
          page={leaderboardPage}
          totalPages={activeLeaderboard.totalPages}
          onPageChange={setLeaderboardPage}
          isLoading={activeLeaderboard.isLoading}
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
    </div>
  )
}

export default WordlePage
