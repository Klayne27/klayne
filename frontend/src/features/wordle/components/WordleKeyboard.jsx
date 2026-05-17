import { IoBackspaceOutline } from "react-icons/io5"

const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"]

const getKeyState = (letter, guesses, isRevealing) => {
  const rank = { absent: 1, present: 2, correct: 3 }
  let best = null
  const activeGuesses = isRevealing ? guesses.slice(0, -1) : guesses
  activeGuesses.forEach((guess) => {
    guess.word.split("").forEach((char, index) => {
      if (char !== letter) return
      const state = guess.result[index]
      if (!best || rank[state] > rank[best]) best = state
    })
  })
  return best
}

const keyClass = (state) => {
  if (state === "correct") return "bg-[#538d4e] text-white border-[#538d4e]"
  if (state === "present") return "bg-[#b59f3b] text-white border-[#b59f3b]"
  if (state === "absent") return "bg-[#3a3a3c] text-white border-[#3a3a3c]"
  return "bg-[#818384] text-white border-transparent hover:bg-base-content/20 active:bg-base-content/30"
}

const WordleKeyboard = ({
  guesses = [],
  onLetter,
  onEnter,
  onBackspace,
  disabled,
  isRevealing = false,
}) => (
  <div className="mx-auto mt-6 flex w-full max-w-[500px] select-none flex-col gap-1.5">
    {KEY_ROWS.map((row, rowIndex) => (
      <div key={row} className="flex touch-manipulation justify-center gap-1.5">
        {rowIndex === 1 && <div className="flex-[0.37]" />}

        {/* Row 3 – Enter */}
        {rowIndex === 2 && (
          <button
            type="button"
            onClick={onEnter}
            disabled={disabled}
            className="flex h-14 flex-[1.5] items-center justify-center rounded bg-[#818384] text-xs font-bold uppercase text-white transition disabled:opacity-50"
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
            className={`flex h-14 min-w-0 flex-1 items-center justify-center rounded border-0 text-sm font-black uppercase transition disabled:opacity-50 sm:text-base ${keyClass(
              getKeyState(letter, guesses, isRevealing),
            )}`}
          >
            {letter}
          </button>
        ))}

        {/* Row 3 – Backspace */}
        {rowIndex === 2 && (
          <button
            type="button"
            onClick={onBackspace}
            disabled={disabled}
            className="flex h-14 flex-[1.5] items-center justify-center rounded bg-[#818384] text-xl font-bold text-white transition disabled:opacity-50"
          >
            <IoBackspaceOutline size={24} />
          </button>
        )}

        {rowIndex === 1 && <div className="flex-[0.37]" />}
      </div>
    ))}
  </div>
)

export default WordleKeyboard
