import React from "react"

const STAGGER_MS = 300

const RESULT_COLORS = {
  correct: "#538d4e",
  present: "#b59f3b",
  absent: "#3a3a3c",
}

const stateClasses = {
  correct: "border-[#538d4e] bg-[#538d4e] text-white",
  present: "border-[#b59f3b] bg-[#b59f3b] text-white",
  absent: "border-[#3a3a3c] bg-[#3a3a3c] text-white",
  empty: "border-base-300 bg-transparent text-base-content",
  filled: "border-base-content/70 bg-transparent text-base-content",
}

const WordleTile = ({
  letter = "",
  state = "empty",
  isRevealing = false,
  revealDelay = 0,
  revealResult = null,
  isTyped = false,
}) => {
  // CSS custom property carries the dynamic result color into the keyframe
  const revealStyle =
    isRevealing && revealResult
      ? {
          "--wordle-reveal-color": RESULT_COLORS[revealResult] ?? RESULT_COLORS.absent,
          animation: `wordleReveal 500ms ease-in-out ${revealDelay}ms both`,
        }
      : undefined

  return (
    <div className="aspect-square" style={{ perspective: "300px" }}>
      <div
        className={[
          "flex h-full w-full select-none items-center justify-center border-2",
          "text-2xl font-black uppercase sm:text-3xl",
          isRevealing ? stateClasses.filled : stateClasses[state],
          isTyped && state === "filled" && !isRevealing ? "wordle-tile-pop" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={revealStyle}
      >
        {letter}
      </div>
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
      // Two sub-states: waiting for API vs actively flipping
      const isAnimating = isRevealRow && reveal.results !== null
      const isCurrentInput = !isRevealRow && rowIndex === guesses.length

      return (
        <div
          key={rowIndex}
          className={`grid grid-cols-5 gap-1.5 ${
            rowIndex === shakeRowIndex && shakeRowKey > 0 ? "wordle-row-shake" : ""
          }`}
        >
          {Array.from({ length: 5 }).map((_, colIndex) => {
            // ── Reveal row: pending (filled, no animation) or animating ───
            if (isRevealRow) {
              return (
                <WordleTile
                  key={`${rowIndex}-${colIndex}`}
                  letter={reveal.word[colIndex] ?? ""}
                  state="filled"
                  isRevealing={isAnimating}
                  revealDelay={isAnimating ? colIndex * STAGGER_MS : 0}
                  revealResult={isAnimating ? reveal.results[colIndex] : null}
                />
              )
            }

            // ── Submitted guess from cache ─────────────────────────────────
            if (submitted) {
              return (
                <WordleTile
                  key={`${rowIndex}-${colIndex}`}
                  letter={submitted.word[colIndex] ?? ""}
                  state={submitted.result[colIndex]}
                />
              )
            }

            // ── Active input row or empty row ─────────────────────────────
            const letter = isCurrentInput ? (currentGuess[colIndex] ?? "") : ""
            return (
              <WordleTile
                key={`${rowIndex}-${colIndex}`}
                letter={letter}
                state={letter ? "filled" : "empty"}
                isTyped={!!letter}
              />
            )
          })}
        </div>
      )
    })}
  </div>
)

export default WordleBoard
