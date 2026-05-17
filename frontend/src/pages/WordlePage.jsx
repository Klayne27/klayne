import { useEffect, useMemo, useState } from "react"
import { FaArrowLeft, FaChartSimple } from "react-icons/fa6"
import { useNavigate } from "react-router-dom"
import LoadingSpinner from "../components/common/LoadingSpinner"
import { WORDLE_WORDS } from "../constants/wordleWords"
import WordleBoard from "../features/wordle/components/WordleBoard"
import WordleKeyboard from "../features/wordle/components/WordleKeyboard"
import WordleLeaderboard from "../features/wordle/components/WordleLeaderboard"
import {
  useGetTodayWordle,
  useGetWordleAllTimeLeaderboard,
  useGetWordleDailyLeaderboard,
} from "../features/wordle/wordleHooks/useWordleQueries"
import { useSubmitWordleGuess } from "../features/wordle/wordleHooks/useWordleMutations"
import { useWordleStore } from "../store/useWordleStore"
import { showAppToast } from "../utils/showAppToast"

const WordlePage = () => {
  const navigate = useNavigate()
  const [leaderboardPage, setLeaderboardPage] = useState(1)

  const {
    currentGuess,
    addLetter,
    removeLetter,
    clearGuess,
    leaderboardType,
    setLeaderboardType,
  } = useWordleStore()

  const { wordle, isLoading } = useGetTodayWordle()
  const { submitGuess, isSubmittingGuess } = useSubmitWordleGuess()

  const dailyLeaderboard = useGetWordleDailyLeaderboard(leaderboardPage, {
    enabled: leaderboardType === "daily",
  })
  const allTimeLeaderboard = useGetWordleAllTimeLeaderboard(leaderboardPage, {
    enabled: leaderboardType === "all-time",
  })

  const activeLeaderboard =
    leaderboardType === "daily" ? dailyLeaderboard : allTimeLeaderboard

  const guesses = wordle?.attempt?.guesses || []
  const isFinished = wordle?.attempt?.status && wordle.attempt.status !== "in_progress"
  const wordSet = useMemo(() => new Set(WORDLE_WORDS), [])

  const handleSubmit = () => {
    if (isFinished || isSubmittingGuess) return
    if (currentGuess.length !== 5) {
      showAppToast("Not enough letters", "error")
      return
    }
    if (!wordSet.has(currentGuess)) {
      showAppToast("Not in word list", "error")
      return
    }

    submitGuess(currentGuess)
    clearGuess()
  }

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (isFinished || isSubmittingGuess) return

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
  }, [addLetter, currentGuess, isFinished, isSubmittingGuess, removeLetter])

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
    <div className="template mx-auto min-h-screen max-w-3xl px-4 pb-24 pt-4 md:pb-8">
      <div className="mb-4 flex items-center border-b border-base-300 pb-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-2.5 transition hover:bg-secondary"
        >
          <FaArrowLeft className="text-xl" />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-2xl font-black tracking-normal">Wordle</h1>
          <p className="text-xs font-semibold text-base-content/60">
            #{wordle?.puzzleNumber} • {wordle?.date}
          </p>
        </div>
        <FaChartSimple className="mr-3 text-xl text-primary" />
      </div>

      <section className="py-3">
        <WordleBoard guesses={guesses} currentGuess={currentGuess} />

        {isFinished && (
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
          disabled={isFinished || isSubmittingGuess}
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
    </div>
  )
}

export default WordlePage
