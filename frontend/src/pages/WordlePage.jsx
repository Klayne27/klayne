// frontend/src/pages/WordlePage.jsx
import { useCallback, useEffect, useState } from "react"
import { FaArrowLeft, FaChartSimple } from "react-icons/fa6"
import { IoHelpCircleOutline } from "react-icons/io5"
import { useNavigate } from "react-router-dom"
import LoadingSpinner from "../components/common/LoadingSpinner"
import WordleBoard from "../features/wordle/components/WordleBoard"
import WordleKeyboard from "../features/wordle/components/WordleKeyboard"
import WordleLeaderboard from "../features/wordle/components/WordleLeaderboard"
import WordleStatsModal from "../features/wordle/components/WordleStatsModal"
import WordleHelpModal from "../features/wordle/components/WordleHelpModal"
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
import { useQueryClient } from "@tanstack/react-query"
import { userKeys } from "../features/users/usersHooks/userKeys"
import { wordleKeys } from "../features/wordle/wordleHooks/wordleKeys"

const FLIP_DURATION_MS = 500
const STAGGER_MS       = 300
const TOTAL_REVEAL_MS  = 4 * STAGGER_MS + FLIP_DURATION_MS + 150 // 1750ms + safety buffer


const WordlePage = () => {
  const navigate = useNavigate()
  const [leaderboardPage, setLeaderboardPage] = useState(1)
  const [isStatsOpen, setIsStatsOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [shakeRowKey, setShakeRowKey] = useState(0)
  const [shakeRowIndex, setShakeRowIndex] = useState(null)

  const {
    setCurrentGuess,
    currentGuess,
    addLetter,
    removeLetter,
    clearGuess,
    leaderboardType,
    setLeaderboardType,
  } = useWordleStore()

  // ── Hook Synchronization ──────────────────────────────────────────────────
  const { reveal, beginPending, commitResult, clearReveal } = useWordleReveal()

  // Pass the clearReveal cleanup utility directly into your mutation layout setup
  const { submitGuess, isSubmittingGuess } = useSubmitWordleGuess(clearReveal)

  const queryClient = useQueryClient()
  // const { reveal, beginPending, commitResult, clearReveal } = useWordleReveal()
  // const { submitGuess, isSubmittingGuess } = useSubmitWordleGuess()
  // const isRevealing = !!reveal


  const { wordle, isLoading } = useGetTodayWordle()
  const { stats, isLoading: isStatsLoading } = useGetWordleStats({ enabled: isStatsOpen })

  const dailyLeaderboard = useGetWordleDailyLeaderboard(leaderboardPage, {
    enabled: leaderboardType === "daily",
  })
  const allTimeLeaderboard = useGetWordleAllTimeLeaderboard(leaderboardPage, {
    enabled: leaderboardType === "all-time",
  })

  const activeLeaderboard = leaderboardType === "daily" ? dailyLeaderboard : allTimeLeaderboard

  const guesses = wordle?.attempt?.guesses || []
  const isFinished = wordle?.attempt?.status && wordle.attempt.status !== "in_progress"

  // FIXED: Now accurately tracks the hardware animation state from your custom hook
  const isRevealing = !!reveal

  const formatWordleDate = (dateString) => {
    if (!dateString) return ""
    const dateObj = new Date(`${dateString}T00:00:00`)
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

  // ── Guess Submission Flow ─────────────────────────────────────────────────
const handleSubmit = useCallback(() => {
  if (isRevealing || isFinished || isSubmittingGuess) return

  const guess = currentGuess.toLowerCase()

  if (guess.length < 5) {
    triggerShake(guesses.length)
    showAppToast("Not enough letters", "error")
    return
  }

  const rowIndex = guesses.length

  // 1. Clear input and show guess immediately as "filled" tiles
  clearGuess()
  beginPending(rowIndex, guess)

  submitGuess(guess, {
    onSuccess: (data) => {
      const lastGuess = data.attempt.guesses.at(-1)

      // 2. Commit result to cache NOW — the reveal row still takes visual priority
      queryClient.setQueryData(wordleKeys.today(), data)

      // 3. Kick off the CSS flip animation
      commitResult(lastGuess.result)

      // 4. After all 5 tiles finish flipping, clear reveal + show toasts
      setTimeout(() => {
        clearReveal()

        if (data.attempt?.status === "won") {
          showAppToast(`Solved in ${data.attempt.guesses.length}!`, "success")
        } else if (data.attempt?.status === "lost") {
          showAppToast(`The word was ${data.answer?.toUpperCase()}`, "error")
        }

        if (data.unlockedBadges?.length) {
          queryClient.invalidateQueries({ queryKey: userKeys.auth() })
          data.unlockedBadges.forEach((badge) =>
            showAppToast(`Wordle badge unlocked: ${badge.label}`, "success"),
          )
        }

        queryClient.invalidateQueries({ queryKey: wordleKeys.stats() })
        queryClient.invalidateQueries({ queryKey: wordleKeys.leaderboard() })
      }, TOTAL_REVEAL_MS)
    },

    onError: (error) => {
      // Restore everything so the user can try again
      clearReveal()
      setCurrentGuess(guess)
      triggerShake(rowIndex)
      showAppToast(error.message || "Invalid guess", "error")
    },
  })
}, [
  isRevealing,
  isFinished,
  isSubmittingGuess,
  currentGuess,
  guesses.length,
  clearGuess,
  beginPending,
  commitResult,
  clearReveal,
  submitGuess,
  setCurrentGuess,
  triggerShake,
  queryClient,
])
  // ── Keyboard / Shortcuts Listeners ────────────────────────────────────────
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

        <div className="flex items-center gap-1">
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
          isRevealing={isRevealing}
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

      <WordleStatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={stats}
        isLoading={isStatsLoading}
      />

      <WordleHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  )
}

export default WordlePage
