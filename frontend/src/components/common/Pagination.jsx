// components/common/Pagination.jsx
import { useId } from "react"
import { useTheme } from "../../context/ThemeContext"
import { shouldTextBeWhite } from "../../utils/shouldTextBeWhite"

/**
 * @param {number}   page          Current page (1-indexed)
 * @param {number}   totalPages    Total number of pages
 * @param {function} onPageChange  Called with the new page number
 * @param {boolean}  scrollToTop   Scroll to top on change (default: true)
 */
const Pagination = ({ page, totalPages, onPageChange, scrollToTop = true }) => {
  const { theme } = useTheme()
  const inputId = useId()

  if (!totalPages || totalPages <= 1) return null

  const changePage = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return
    if (scrollToTop) window.scrollTo({ top: 0, behavior: "smooth" })
    onPageChange(newPage)
  }

  // Always shows a window of ≤3 pages centred on the current page
  const visiblePages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => {
    if (page <= 2) return p <= 3
    if (page >= totalPages - 1) return p >= totalPages - 2
    return p >= page - 1 && p <= page + 1
  })

  return (
    <div className="mt-10 flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* ── Navigation strip ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 rounded-2xl border border-accent/10 bg-base-200/50 p-1.5 shadow-xl backdrop-blur-md">
          <button
            className="btn btn-ghost btn-sm rounded-xl px-2 text-slate-500 disabled:opacity-30"
            onClick={() => changePage(1)}
            disabled={page === 1}
            title="First page"
          >
            <span className="text-lg">«</span>
          </button>

          <button
            className="btn btn-ghost btn-sm rounded-xl px-2 text-slate-500 disabled:opacity-30"
            onClick={() => changePage(page - 1)}
            disabled={page === 1}
          >
            ‹
          </button>

          <div className="flex items-center gap-1 px-1">
            {visiblePages.map((p) => (
              <button
                key={p}
                onClick={() => changePage(p)}
                className={`h-9 w-9 rounded-xl text-xs font-bold transition-all duration-300 ${
                  p === page
                    ? `scale-105 bg-primary ${shouldTextBeWhite(theme)} shadow-lg shadow-primary/40`
                    : "text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            className="btn btn-ghost btn-sm rounded-xl px-2 text-slate-500 disabled:opacity-30"
            onClick={() => changePage(page + 1)}
            disabled={page === totalPages}
          >
            ›
          </button>

          <button
            className="btn btn-ghost btn-sm rounded-xl px-2 text-slate-500 disabled:opacity-30"
            onClick={() => changePage(totalPages)}
            disabled={page === totalPages}
            title="Last page"
          >
            <span className="text-lg">»</span>
          </button>
        </div>

        {/* ── Jump-to-page ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 rounded-2xl border border-accent/10 bg-base-200/50 px-4 py-2 shadow-lg backdrop-blur-md">
          <label
            htmlFor={inputId}
            className="text-[10px] font-black uppercase tracking-tighter text-slate-500"
          >
            Page
          </label>
          <input
            id={inputId}
            type="number"
            min="1"
            max={totalPages}
            placeholder={String(page)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return
              const val = parseInt(e.target.value, 10)
              if (val >= 1 && val <= totalPages) {
                changePage(val)
                e.target.value = ""
                e.target.blur()
              }
            }}
            className="w-10 bg-transparent text-center text-sm font-black text-primary placeholder:text-slate-600 focus:outline-none"
          />
        </div>
      </div>

      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500/50">
        Viewing {page} / {totalPages}
      </p>
    </div>
  )
}

export default Pagination
