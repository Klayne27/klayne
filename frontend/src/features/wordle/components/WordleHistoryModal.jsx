import { useState } from "react"
import { FaXmark } from "react-icons/fa6"
import LoadingSpinner from "../../../components/common/LoadingSpinner"
import Pagination from "../../../components/common/Pagination"
import useLockBodyScroll from "../../../hooks/customHooks/useLockBodyScroll"
import { useGetWordleHistory } from "../wordleHooks/useWordleQueries"
import WordleProgressGrid from "./WordleProgressGrid"

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  if (!dateStr) return ""
  const d = new Date(`${dateStr}T00:00:00`)
  if (isNaN(d.getTime())) return dateStr
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d)
}

// ── HistoryCard ───────────────────────────────────────────────────────────────

const HistoryCard = ({ entry }) => {
  const isWon = entry.status === "won"

  return (
    <div
      className={[
        "flex flex-col items-center gap-2 rounded-xl border p-3 transition-all",
        isWon ? "border-[#538d4e]/30 bg-[#538d4e]/5" : "border-base-300/70 bg-base-200/30",
      ].join(" ")}
    >
      {/* Puzzle # and result badge */}
      <div className="flex w-full items-center justify-center">
        {/* <span className="text-[9px] font-black uppercase tracking-widest text-base-content/35">
          {entry.puzzleNumber ? `#${entry.puzzleNumber}` : "—"}
        </span> */}
        <span
          className={[
            "rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider",
            isWon ? "bg-[#538d4e]/20 text-[#538d4e]" : "bg-red-500/15 text-red-400",
          ].join(" ")}
        >
          {isWon ? `${entry.score}/6` : "X/6"}
        </span>
      </div>

      {/* Mini progress grid — the visual centrepiece */}
      <WordleProgressGrid guesses={entry.guesses} size="sm" />

      {/* The answer word */}
      <p className="font-mono text-sm font-black uppercase tracking-widest">
        {entry.answer ?? "?????"}
      </p>

      {/* Date */}
      <p className="text-[9px] text-base-content/35">{formatDate(entry.date)}</p>
    </div>
  )
}

// ── WordleHistoryModal ────────────────────────────────────────────────────────

/**
 * Full solve-history browser.
 *
 * Usage inside WordleStatsModal:
 *   <WordleHistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
 */
const WordleHistoryModal = ({ isOpen, onClose }) => {
  const [page, setPage] = useState(1)

  // Only fetch when the modal is actually open
  const { history, totalPages, totalCount, isLoading, isFetching } = useGetWordleHistory(page, {
    enabled: isOpen,
  })

  useLockBodyScroll(isOpen)

  // Reset to page 1 when modal is closed so next open starts fresh
  const handleClose = () => {
    setPage(1)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/75 px-2"
      onClick={handleClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Fixed header ──────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-b border-base-300 px-5 py-4">
          <div>
            <h2 className="text-xl font-black">Solve History</h2>
            <p className="text-sm text-base-content/55">
              {isLoading
                ? "Loading…"
                : totalCount > 0
                  ? `${totalCount} completed puzzle${totalCount !== 1 ? "s" : ""}`
                  : "No completed puzzles yet"}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-2 transition hover:bg-base-200"
            aria-label="Close history"
          >
            <FaXmark className="text-xl" />
          </button>
        </div>

        {/* ── Scrollable content ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : history.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-3xl">🟩</p>
              <p className="mt-3 text-sm font-bold text-base-content/60">
                No completed puzzles yet. Keep playing!
              </p>
            </div>
          ) : (
            <>
              {/* Card grid — more columns on wider screens */}
              <div
                className={`grid gap-3 ${
                  isFetching ? "opacity-60 transition-opacity" : ""
                } grid-cols-2 sm:grid-cols-3 md:grid-cols-7`}
              >
                {history.map((entry) => (
                  <>
                    <HistoryCard key={String(entry.id ?? entry.date)} entry={entry} />
                  </>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-5">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={(p) => {
                      setPage(p)
                      // Scroll the modal content back to the top
                      document
                        .querySelector("[data-history-scroll]")
                        ?.scrollTo({ top: 0, behavior: "smooth" })
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default WordleHistoryModal
