// features/wordle/components/WordleBoard.jsx
//
// No Framer Motion. Animation is driven by CSS classes:
//   "tile-flip-out"  → scaleY 1→0  (tile squishes flat)
//   "tile-flip-in"   → scaleY 0→1  (tile unsquishes, color already set)
//   "tile-pop"       → brief scale-up when a letter is typed
//   "row-shake"      → horizontal shake on invalid word
//
// The tile's `key` includes the letter so React remounts the node on each
// keypress, which restarts the pop animation correctly.

const STATE_CLASSES = {
  correct: "border-[#538d4e] bg-[#538d4e] text-white",
  present: "border-[#b59f3b] bg-[#b59f3b] text-white",
  absent: "border-[#3a3a3c] bg-[#3a3a3c] text-white",
  empty: "border-base-300 bg-transparent text-base-content",
  filled: "border-base-content/70 bg-transparent text-base-content",
}

// ── Single tile ───────────────────────────────────────────────────────────────
const WordleTile = ({ letter, colorState, flipPhase, isTyped }) => {
  // Which CSS animation class to apply
  let animClass = ""
  if (flipPhase === "out") animClass = "tile-flip-out"
  else if (flipPhase === "in") animClass = "tile-flip-in"
  else if (isTyped) animClass = "tile-pop"

  return (
    <div
      className={[
        "flex aspect-square items-center justify-center border-2",
        "text-2xl font-black uppercase sm:text-3xl",
        STATE_CLASSES[colorState] ?? STATE_CLASSES.empty,
        animClass,
      ].join(" ")}
    >
      {letter}
    </div>
  )
}

// ── Board ─────────────────────────────────────────────────────────────────────
const WordleBoard = ({
  guesses = [],
  currentGuess = "",
  shakeRowIndex = null,
  shakeRowKey = 0,
  reveal = null,
}) => (
  <div className="mx-auto grid w-full max-w-[280px] grid-rows-6 gap-1.5 md:max-w-[330px]">
    {Array.from({ length: 6 }).map((_, rowIndex) => {
      const submitted = guesses[rowIndex]
      const isRevealRow = reveal?.rowIndex === rowIndex

      const tiles = Array.from({ length: 5 }).map((_, colIndex) => {
        // ── Reveal row: driven entirely by the hook ───────────────────────
        if (isRevealRow) {
          const letter = reveal.word[colIndex] ?? ""
          const flipPhase = reveal.phases[colIndex] // "idle" | "out" | "in"
          const flipColor = reveal.colors[colIndex] // null | "correct" | "present" | "absent"

          // Color is visible only once the tile is flipping back in
          const colorState =
            flipPhase === "in" && flipColor ? flipColor : letter ? "filled" : "empty"

          return { letter, colorState, flipPhase, isTyped: false }
        }

        // ── Completed row (from server cache) ─────────────────────────────
        if (submitted) {
          return {
            letter: submitted.word[colIndex] ?? "",
            colorState: submitted.result[colIndex],
            flipPhase: null,
            isTyped: false,
          }
        }

        // ── Active input row ──────────────────────────────────────────────
        if (rowIndex === guesses.length && !reveal) {
          const letter = currentGuess[colIndex] ?? ""
          return {
            letter,
            colorState: letter ? "filled" : "empty",
            flipPhase: null,
            isTyped: !!letter,
          }
        }

        // ── Empty future row ──────────────────────────────────────────────
        return { letter: "", colorState: "empty", flipPhase: null, isTyped: false }
      })

      const isShaking = rowIndex === shakeRowIndex && shakeRowKey > 0

      return (
        <div
          key={rowIndex} // stable key — never remount rows mid-animation
          className={`grid grid-cols-5 gap-1.5 ${isShaking ? "row-shake" : ""}`}
        >
          {tiles.map((tile, colIndex) => (
            <WordleTile
              // Include letter in key so pop animation restarts on each keypress
              key={`${rowIndex}-${colIndex}-${tile.isTyped ? tile.letter : ""}`}
              {...tile}
            />
          ))}
        </div>
      )
    })}
  </div>
)

export default WordleBoard
