import React from "react"
import SearchPanel from "./SearchPanel"
import SuggestedUsersPanel from "./SuggestedUsersPanel"
import FloatingPomodoroTimer from "../../features/pomodoro/components/FloatingPomodoroTimer"
import { useLocation } from "react-router-dom"
import TrendingTagsPanel from "./TrendingTagsPanel"

// const TRENDING_ROUTES = ["/", "/ic", "/vent", "/explore"]

const RightPanel = () => {
  const { pathname } = useLocation()
  const isOnPomodoroPage = pathname === "/pomodoro"
  const showTrending =  pathname.startsWith("/trending")

  return (
    <aside className="sticky top-0 hidden h-screen w-[380px] flex-shrink-0 flex-col self-start pl-7 lg:flex">
      {/* ── Sticky search header — always visible at the top ── */}
      <div className="sticky top-0 z-10 bg-base-100/80 pt-1 backdrop-blur-md">
        <SearchPanel />
      </div>

      {/* ── Scrollable content below the search bar ── */}
      <div className="flex flex-1 flex-col scroll-smooth pb-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {!showTrending ? (
          <TrendingTagsPanel />
        ) : (
          <div className="mb-4 mt-3 w-full rounded-full border-accent border"></div>
        )}
        <SuggestedUsersPanel />
        {!isOnPomodoroPage && <FloatingPomodoroTimer />}

        {/* <footer className="mt-4 flex flex-wrap gap-2 px-1 text-[13px] text-slate-500">
          <span>Terms of Service</span>
          <span>Privacy Policy</span>
          <span>© 2026 Gemini Space</span>
        </footer> */}
      </div>
    </aside>
  )
}

export default React.memo(RightPanel)
