const stateClasses = {
  correct: "border-[#538d4e] bg-[#538d4e] text-white",
  present: "border-[#b59f3b] bg-[#b59f3b] text-white",
  absent: "border-[#3a3a3c] bg-[#3a3a3c] text-white",
  empty: "border-base-300 bg-transparent text-base-content",
  filled: "border-base-content/70 bg-transparent text-base-content",
}

const WordleBoard = ({ guesses = [], currentGuess = "" }) => {
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
        <div key={rowIndex} className="grid grid-cols-5 gap-1.5">
          {row.map((tile, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`flex aspect-square items-center justify-center border-2 text-2xl font-black uppercase transition-colors sm:text-3xl ${stateClasses[tile.state]}`}
            >
              {tile.letter}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default WordleBoard
