import { useState, useCallback, useRef, useEffect } from "react"
import { CATEGORIES, getRandomByCategory } from "../../../constants/quotes"
import { FaChevronDown } from "react-icons/fa6"
import { Tooltip } from "react-tooltip"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { useIsMobile } from "../../../hooks/customHooks/useIsMobile"

const CATEGORY_STYLES = {
  all: {
    active: "bg-primary/10 text-primary border-primary/20",
    dot: "bg-primary",
  },
  motivational: {
    active: "bg-pink-400/20 text-pink-400 border-pink-400/30",
    dot: "bg-pink-400",
  },
  inspirational: {
    active: "bg-teal-400/20 text-teal-400 border-teal-400/30",
    dot: "bg-teal-400",
  },
  discipline: {
    active: "bg-indigo-400/20 text-indigo-400 border-indigo-400/30",
    dot: "bg-indigo-400",
  },
  happiness: {
    active: "bg-amber-400/20 text-amber-400 border-amber-400/30",
    dot: "bg-amber-400",
  },
  philosophical: {
    active: "bg-rose-400/20 text-rose-400 border-rose-400/30",
    dot: "bg-rose-400",
  },
}

function QuoteWidget() {
  const [activeCategory, setActiveCategory] = useState("all")
  const [quote, setQuote] = useState(() => getRandomByCategory("all"))
  const [isAnimating, setIsAnimating] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const { authUser } = useAuthUser()
  const isMobile = useIsMobile()

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const cycleQuote = useCallback(
    (category = activeCategory) => {
      setIsAnimating(true)
      setTimeout(() => {
        setQuote(getRandomByCategory(category))
        setIsAnimating(false)
      }, 200)
    },
    [activeCategory],
  )

  const handleSelect = (cat) => {
    setActiveCategory(cat)
    cycleQuote(cat)
    setIsOpen(false)
  }

  const activeStyle = CATEGORY_STYLES[activeCategory]
  const isBackgroundPicked = authUser?.pomodoroBackgroundUrl || authUser.pomodoroBackground

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg p-6 px-6 text-center backdrop-blur-sm">
      {/* Category dropdown */}
      <div className="relative w-full max-w-[160px]" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex w-full items-center justify-between rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 focus:outline-none ${activeStyle.active}`}
        >
          <span className="flex-1 text-left">{activeCategory}</span>
          <FaChevronDown
            className={`size-3 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isOpen && (
          <div className="absolute left-0 z-50 mt-2 w-full overflow-hidden rounded-2xl border border-accent/20 bg-base-100 p-1 shadow-2xl">
            {CATEGORIES.map((cat) => {
              const s = CATEGORY_STYLES[cat]
              return (
                <button
                  key={cat}
                  onClick={() => handleSelect(cat)}
                  className={`flex w-full items-center gap-2 rounded-xl px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider transition-colors hover:bg-white/5 ${
                    activeCategory === cat ? `${s.active} !bg-transparent` : "text-slate-500"
                  }`}
                >
                  <span className={`size-1.5 rounded-full ${s.dot} shrink-0`} />
                  {cat}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Quote body */}
      <div
        className={`flex min-h-[140px] flex-col items-center justify-center gap-4 rounded-xl transition-all duration-200 ${
          isAnimating ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        <p
          className={`duration transition-300 font-serif text-sm leading-relaxed ${isBackgroundPicked && !isMobile ? "text-slate-400" : ""}`}
        >
          &ldquo;{quote.text}&rdquo;
        </p>
        <div className="flex items-center gap-2">
          <div className={`h-[2px] w-5 ${activeStyle.dot} opacity-40`} />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            {quote.author}
          </span>
        </div>
      </div>

      {/* Refresh button */}
      <button
        onClick={() => cycleQuote()}
        data-tooltip-id="refresh-quote-tooltip"
        data-tooltip-content="New Quote"
        className="group mt-1 flex items-center justify-center gap-2 rounded-full border border-white/5 bg-white/[0.03] px-5 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 transition-all hover:bg-white/[0.07] hover:text-slate-500"
      >
        <svg
          className="size-3 transition-transform duration-500 group-hover:rotate-180"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
        </svg>
        Refresh
      </button>

      <Tooltip
        id="refresh-quote-tooltip"
        place="top"
        className="!z-[100] !rounded-lg !px-2 !py-1 !text-[10px] font-bold tracking-wide shadow-2xl"
      />
    </div>
  )
}

export default QuoteWidget
