// frontend/src/features/wordle/components/WordleHelpModal.jsx
import { IoClose } from "react-icons/io5"

const WordleHelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  // Helper template to render mini-example rows cleanly
  const ExampleRow = ({ letters, highlightIndex, stateClassName }) => (
    <div className="my-2 flex gap-1.5">
      {letters.split("").map((letter, idx) => {
        const isHighlighted = idx === highlightIndex
        return (
          <div
            key={idx}
            className={`flex h-10 w-10 select-none items-center justify-center rounded-sm border-2 text-xl font-extrabold uppercase ${
              isHighlighted ? stateClassName : "border-base-300 bg-transparent text-base-content"
            }`}
          >
            {letter}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="bg-base-900/50 fixed inset-0 z-50 flex animate-fade-in items-center justify-center p-4 backdrop-blur-[1px]">
      {/* Click outside backdrop to close overlay */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-base-300 bg-base-100 p-6 text-base-content shadow-2xl">
        {/* Close Button Header Icon */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-base-content/60 transition hover:bg-base-200 hover:text-base-content"
        >
          <IoClose className="text-2xl" />
        </button>

        {/* Content Segment */}
        <h2 className="font-serif text-3xl font-bold tracking-tight text-base-content">
          How To Play
        </h2>
        <h3 className="mt-1 text-xl font-light text-base-content/90">
          Guess the Wordle in 6 tries.
        </h3>

        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm font-normal leading-tight text-base-content/80">
          <li>Each guess must be a valid 5-letter word.</li>
          <li>The color of the tiles will change to show how close your guess was to the word.</li>
        </ul>

        <div className="space-y-4 py-6">
          <p className="text-sm font-bold text-base-content">Examples</p>

          {/* Correct Spot Example */}
          <div>
            <ExampleRow
              letters="weary"
              highlightIndex={0}
              stateClassName="border-[#538d4e] bg-[#538d4e] text-white"
            />
            <p className="text-sm text-base-content/80">
              <span className="font-bold">W</span> is in the word and in the correct spot.
            </p>
          </div>

          {/* Wrong Spot Example */}
          <div>
            <ExampleRow
              letters="pills"
              highlightIndex={1}
              stateClassName="border-[#b59f3b] bg-[#b59f3b] text-white"
            />
            <p className="text-sm text-base-content/80">
              <span className="font-bold">I</span> is in the word but in the wrong spot.
            </p>
          </div>

          {/* Absent Spot Example */}
          <div>
            <ExampleRow
              letters="vague"
              highlightIndex={2}
              stateClassName="border-[#3a3a3c] bg-[#3a3a3c] text-white"
            />
            <p className="text-sm text-base-content/80">
              <span className="font-bold">G</span> is not in the word in any spot.
            </p>
          </div>
        </div>

        <p className="text-sm font-semibold text-base-content/90">
          A new puzzle is released daily at midnight UTC.
        </p>
      </div>
    </div>
  )
}

export default WordleHelpModal
