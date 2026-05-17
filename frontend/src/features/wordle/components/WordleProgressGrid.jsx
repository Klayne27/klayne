const TILE_COLORS = {
  correct: "bg-[#538d4e]",
  present: "bg-[#b59f3b]",
  absent: "bg-[#3a3a3c]",
  empty: "bg-base-300",
}

const WordleProgressGrid = ({ guesses = [], size = "sm" }) => {
  const tileSize = size === "xs" ? "size-2" : "size-3"
  const gap = size === "xs" ? "gap-0.5" : "gap-1"

  return (
    <div className={`grid grid-rows-6 ${gap}`} aria-label="Wordle progress">
      {Array.from({ length: 6 }).map((_, rowIndex) => (
        <div key={rowIndex} className={`grid grid-cols-5 ${gap}`}>
          {Array.from({ length: 5 }).map((__, colIndex) => {
            const state = guesses[rowIndex]?.result?.[colIndex] || "empty"
            return (
              <span
                key={`${rowIndex}-${colIndex}`}
                className={`${tileSize} rounded-[2px] ${TILE_COLORS[state]}`}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default WordleProgressGrid
