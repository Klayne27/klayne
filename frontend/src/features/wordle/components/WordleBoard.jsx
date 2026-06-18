const stateClasses = {
  correct: "border-[#538d4e] bg-[#538d4e] text-white",
  present: "border-[#b59f3b] bg-[#b59f3b] text-white",
  absent: "border-[#3a3a3c] bg-[#3a3a3c] text-white",
  empty: "border-base-300 bg-transparent text-base-content",
  filled: "border-base-content/70 bg-transparent text-base-content",
}

const WordleBoard = ({
  guesses = [],
  currentGuess = "",
  shakeRowIndex = null,
  shakeRowKey = 0,
  revealingRowIndex = null,
  revealedTileCount = 5,
}) => {
  const rows = Array.from({ length: 6 }).map((_, rowIndex) => {
    const submitted = guesses[rowIndex]
    const letters = submitted?.word || (rowIndex === guesses.length ? currentGuess : "")

    return Array.from({ length: 5 }).map((__, colIndex) => ({
      letter: letters[colIndex] || "",
      state: submitted?.result?.[colIndex] || (letters[colIndex] ? "filled" : "empty"),
    }))
  })

  return (
    <div className="mx-auto grid w-full max-w-[330px] grid-rows-6 gap-1.5">
      {rows.map((row, rowIndex) => {
        const isShaking = rowIndex === shakeRowIndex && shakeRowKey > 0
        const isRevealing = rowIndex === revealingRowIndex

        return (
          <div
            key={`${rowIndex}-${isShaking ? shakeRowKey : "stable"}`}
            className={`grid grid-cols-5 gap-1.5 ${isShaking ? "wordle-row-shake" : ""}`}
          >
            {row.map((tile, colIndex) => {
              const isTileRevealing = isRevealing
              const displayState =
                isTileRevealing && colIndex >= revealedTileCount ? "filled" : tile.state

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={[
                    "flex items-center justify-center border-2",
                    "w-full",
                    "text-2xl font-black uppercase sm:text-3xl",
                    "h-[62px] sm:h-[66px]",
                    "transition-colors",
                    "will-change-transform",
                    "backface-visibility-hidden",
                    stateClasses[displayState],
                    isTileRevealing ? "wordle-tile-reveal" : "",
                    tile.state === "filled" && !isTileRevealing ? "wordle-tile-pop" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={
                    isTileRevealing
                      ? {
                          animationDelay: `${colIndex * 350}ms`,
                          WebkitFontSmoothing: "antialiased",
                          transform: "translateZ(0)",
                        }
                      : undefined
                  }
                >
                  {tile.letter}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

export default WordleBoard
