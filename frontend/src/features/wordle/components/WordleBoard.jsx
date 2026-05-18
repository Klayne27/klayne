import { motion } from "framer-motion"

const stateClasses = {
  correct: "border-[#538d4e] bg-[#538d4e] text-white",
  present: "border-[#b59f3b] bg-[#b59f3b] text-white",
  absent: "border-[#3a3a3c] bg-[#3a3a3c] text-white",
  empty: "border-base-300 bg-transparent text-base-content",
  filled: "border-base-content/70 bg-transparent text-base-content",
}

/**
 * Single tile.
 * flipPhase null        → static tile (input row or completed past row)
 * flipPhase 'idle'      → pre-flip, letter visible at rest
 * flipPhase 'out'       → rotating to 90° (face disappearing)
 * flipPhase 'in'        → rotating from 90° back to 0° (new color revealed)
 *
 * The color class changes when flipPhase transitions 'out' → 'in'.
 * Because the tile is edge-on at that exact moment the change is invisible.
 */
const WordleTile = ({ letter, displayState, flipPhase, isTyped }) => (
  // Parent div provides the perspective context for the 3D rotation
  <div className="aspect-square" style={{ perspective: "250px" }}>
    <motion.div
      className={`flex h-full w-full items-center justify-center border-2 text-2xl font-black uppercase sm:text-3xl ${stateClasses[displayState]} ${isTyped && !flipPhase ? "wordle-tile-pop" : ""}`}
      // 'out' → rotate to edge-on; anything else → return to face-up
      animate={{ rotateX: flipPhase === "out" ? 90 : 0 }}
      initial={false} // no animation on first mount
      transition={{
        duration: 0.32,
        // easeIn going away, easeOut coming back — feels like a real card flip
        ease: flipPhase === "out" ? [0.55, 0, 1, 0.45] : [0, 0.55, 0.45, 1],
      }}
    >
      {letter}
    </motion.div>
  </div>
)

const WordleBoard = ({
  guesses = [],
  currentGuess = "",
  shakeRowIndex = null,
  shakeRowKey = 0,
  reveal = null, // from useWordleReveal
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
          // Show the result color once the tile is flipping back in;
          // until then display "filled" so the front face looks normal
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
          key={`${rowIndex}-${rowIndex === shakeRowIndex ? shakeRowKey : "stable"}`}
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
