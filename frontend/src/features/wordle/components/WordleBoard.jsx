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
      {rows.map((row, rowIndex) => (
        <div
          key={`${rowIndex}-${rowIndex === shakeRowIndex ? shakeRowKey : "stable"}`}
          className={`grid grid-cols-5 gap-1.5 ${
            rowIndex === shakeRowIndex && shakeRowKey > 0 ? "wordle-row-shake" : ""
          }`}
        >
          {row.map((tile, colIndex) => {
            const isRevealingTile = rowIndex === revealingRowIndex
            const displayState =
              isRevealingTile && colIndex >= revealedTileCount ? "filled" : tile.state

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`flex aspect-square items-center justify-center border-2 text-2xl font-black uppercase transition-colors sm:text-3xl ${
                  stateClasses[displayState]
                } ${isRevealingTile ? "wordle-tile-reveal" : ""} ${
                  tile.state === "filled" ? "wordle-tile-pop" : ""
                }`}
                style={
                  isRevealingTile
                    ? {
                        // Increased from 160ms to 350ms for a distinct one-by-one cadence
                        animationDelay: `${colIndex * 350}ms`,
                      }
                    : undefined
                }
              >
                {tile.letter}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default WordleBoard
