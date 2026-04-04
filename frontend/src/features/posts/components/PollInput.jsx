// components/PostModal/PollInputs.jsx
import { IoCloseSharp } from "react-icons/io5"
import { FaPlus } from "react-icons/fa"
import { MAX_POLL_CHOICES, POLL_CHOICE_MAX_LENGTH } from "../../../constants/numberConstants"

export const PollInputs = ({
  pollChoices,
  focusedPollInputIndex,
  onChoiceChange,
  onAddChoice,
  onRemoveChoice,
  onInputFocus,
  onInputBlur,
  onRemovePoll,
}) => (
  <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-accent p-3">
    {pollChoices.map((choice, index) => (
      <div key={index} className="relative flex items-center gap-1">
        <div className={`relative ${pollChoices.length > 3 ? "w-full" : "mr-7 w-full"}`}>
          <input
            type="text"
            placeholder={`Choice ${index + 1}`}
            className={`border border-accent bg-black/0 p-2 py-3 ${
              pollChoices.length > 3 ? "w-full" : "mr-7 w-full"
            } focus:border-accent/99 rounded-[4px] placeholder:text-slate-500 focus:outline-none`}
            value={choice.text}
            onChange={(e) => onChoiceChange(index, e.target.value)}
            onFocus={() => onInputFocus(index)}
            onBlur={onInputBlur}
            maxLength={POLL_CHOICE_MAX_LENGTH}
          />

          {focusedPollInputIndex === index && (
            <span className="absolute right-2 top-1 text-xs text-slate-500">
              {choice.text.length} / {POLL_CHOICE_MAX_LENGTH}
            </span>
          )}

          {index >= 2 && (
            <button
              type="button"
              onClick={() => onRemoveChoice(index)}
              className="absolute right-1 top-3.5 text-red-600 transition duration-200 hover:text-red-400"
            >
              <IoCloseSharp size={23} />
            </button>
          )}
        </div>

        {index === pollChoices.length - 1 && pollChoices.length < MAX_POLL_CHOICES && (
          <button
            type="button"
            onClick={onAddChoice}
            className="absolute right-0 text-primary transition duration-200 hover:text-blue-400"
          >
            <FaPlus size={18} />
          </button>
        )}
      </div>
    ))}

    <div className="flex items-center justify-center">
      <button
        type="button"
        onClick={onRemovePoll}
        className="mb-1 mt-2 rounded-full px-3 py-1 text-red-600 transition duration-200 hover:text-red-400"
      >
        Remove poll
      </button>
    </div>
  </div>
)
