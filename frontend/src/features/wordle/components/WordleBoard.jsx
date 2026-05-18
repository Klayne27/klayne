import { motion } from "framer-motion"

const stateClasses = {
  correct: "border-[#538d4e] bg-[#538d4e] text-white",
  present: "border-[#b59f3b] bg-[#b59f3b] text-white",
  absent: "border-[#3a3a3c] bg-[#3a3a3c] text-white",
  empty: "border-base-300 bg-transparent text-base-content",
  filled: "border-base-content/70 bg-transparent text-base-content",
}

// Explicit variants guarantee Framer Motion registers the step transitions cleanly
const tileVariants = {
  static: { rotateX: 0 },
  out: { rotateX: 90 },
  in: { rotateX: 0 },
}

/**
 * Single tile.
 */
const WordleTile = ({ letter, displayState, flipPhase, isTyped }) => {
  // Determine which explicit animation state string to pass downstream
  const currentVariant = flipPhase === "out" ? "out" : flipPhase === "in" ? "in" : "static"

  return (
    <div className="aspect-square" style={{ perspective: "1000px" }}>
      <motion.div
        variants={tileVariants}
        animate={currentVariant}
        initial="static"
        className={`flex h-full w-full items-center justify-center border-2 text-2xl font-black uppercase sm:text-3xl ${
          stateClasses[displayState]
        } ${isTyped && !flipPhase ? "wordle-tile-pop" : ""}`}
        style={{
          transformStyle: "preserve-3d", // Required for hardware accelerated 3D graphics
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          willChange: "transform",
        }}
        transition={{
          duration: 0.25, // Snappier NYT accurate flip rate
          ease: flipPhase === "out" ? [0.4, 0, 1, 1] : [0, 0, 0.2, 1],
        }}
      >
        {letter}
      </motion.div>
    </div>
  )
}

const WordleBoard = ({
  guesses = [],
  currentGuess = "",
  shakeRowIndex = null,
  shakeRowKey = 0,
  reveal = null,
}) => (
  <div className="mx-auto grid w-full max-w-[330px] grid-rows-6 gap-1.5">
    {Array.from({ length: 6 }).map((_, rowIndex) => {
      const submitted = guesses[rowIndex]
      const isRevealRow = reveal?.rowIndex === rowIndex

      const tiles = Array.from({ length: 5 }).map((__, colIndex) => {
        // ── Active reveal row — driven entirely by the hook ──────────────
        if (isRevealRow) {
          const letter = reveal.word[colIndex] ?? ""
          const flipPhase = reveal.phases[colIndex]
          const flipColor = reveal.colors[colIndex]

          // Show the result color once the tile is flipping back in
          const displayState =
            flipPhase === "in" && flipColor ? flipColor : letter ? "filled" : "empty"

          return { letter, displayState, flipPhase, isTyped: false }
        }

        // ── Completed guess (from cache) ─────────────────────────────────
        if (submitted) {
          return {
            letter: submitted.word[colIndex] ?? "",
            displayState: submitted.result[colIndex],
            flipPhase: null,
            isTyped: false,
          }
        }

        // ── Current input row or empty row ───────────────────────────────
        const isInputRow = rowIndex === guesses.length && !reveal
        const letter = isInputRow ? (currentGuess[colIndex] ?? "") : ""
        return {
          letter,
          displayState: letter ? "filled" : "empty",
          flipPhase: null,
          isTyped: !!letter,
        }
      })

      return (
        <div
          // FIXED: Kept the key completely stable using only rowIndex.
          // This stops React from destroying the DOM node and cancelling animations.
          key={rowIndex}
          className={`grid grid-cols-5 gap-1.5 ${
            rowIndex === shakeRowIndex && shakeRowKey > 0 ? "wordle-row-shake" : ""
          }`}
        >
          {tiles.map((tile, colIndex) => (
            <WordleTile key={`${rowIndex}-${colIndex}`} {...tile} />
          ))}
        </div>
      )
    })}
  </div>
)

export default WordleBoard
