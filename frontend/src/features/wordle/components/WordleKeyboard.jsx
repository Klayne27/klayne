const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"]

const getKeyState = (letter, guesses) => {
  const rank = { absent: 1, present: 2, correct: 3 }
  let best = null

  guesses.forEach((guess) => {
    guess.word.split("").forEach((char, index) => {
      if (char !== letter) return
      const state = guess.result[index]
      if (!best || rank[state] > rank[best]) best = state
    })
  })

  return best
}

const keyClass = (state) => {
  if (state === "correct") return "bg-[#538d4e] text-white"
  if (state === "present") return "bg-[#b59f3b] text-white"
  if (state === "absent") return "bg-[#3a3a3c] text-white"
  return "bg-base-300 text-base-content hover:bg-base-content/20"
}

const WordleKeyboard = ({ guesses = [], onLetter, onEnter, onBackspace, disabled }) => (
  <div className="mx-auto mt-6 flex w-full max-w-xl flex-col gap-2">
    {KEY_ROWS.map((row, rowIndex) => (
      <div key={row} className="flex justify-center gap-1">
        {rowIndex === 2 && (
          <button
            type="button"
            onClick={onEnter}
            disabled={disabled}
            className="h-12 rounded-md bg-base-300 px-3 text-xs font-bold uppercase transition hover:bg-base-content/20 disabled:opacity-50"
          >
            Enter
          </button>
        )}
        {row.split("").map((letter) => (
          <button
            type="button"
            key={letter}
            onClick={() => onLetter(letter)}
            disabled={disabled}
            className={`h-12 min-w-0 flex-1 rounded-md text-sm font-black uppercase transition disabled:opacity-50 sm:h-14 sm:text-base ${keyClass(getKeyState(letter, guesses))}`}
          >
            {letter}
          </button>
        ))}
        {rowIndex === 2 && (
          <button
            type="button"
            onClick={onBackspace}
            disabled={disabled}
            className="h-12 rounded-md bg-base-300 px-3 text-lg font-bold transition hover:bg-base-content/20 disabled:opacity-50 sm:h-14"
          >
            ←
          </button>
        )}
      </div>
    ))}
  </div>
)

export default WordleKeyboard
