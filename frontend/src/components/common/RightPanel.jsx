import React from "react"
import SearchPanel from "./SearchPanel"
import SuggestedUsersPanel from "./SuggestedUsersPanel"
import FloatingPomodoroTimer from "../../features/pomodoro/components/FloatingPomodoroTimer"
import { useLocation } from "react-router-dom"
import TrendingTagsPanel from "./TrendingTagsPanel"

const TRENDING_ROUTES = ["/", "/ic", "/vent", "/explore"]

const RightPanel = () => {
  const { pathname } = useLocation()
  const isOnPomodoroPage = pathname === "/pomodoro"
  const showTrending = TRENDING_ROUTES.includes(pathname) || pathname.startsWith("/hashtag")

  return (
    <aside className="sticky top-0 hidden h-screen w-[380px] flex-shrink-0 flex-col self-start border-l border-accent lg:flex">
      {/* ── Sticky search header — always visible at the top ── */}
      <div className="sticky top-0 z-10 bg-base-100/80 px-4 pb-2 pt-3 backdrop-blur-md">
        <SearchPanel />
      </div>

      {/* ── Scrollable content below the search bar ── */}
      <div className="flex flex-1 flex-col overflow-y-auto scroll-smooth px-4 pb-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {showTrending && <TrendingTagsPanel />}
        <SuggestedUsersPanel />
        {!isOnPomodoroPage && <FloatingPomodoroTimer />}

        <footer className="mt-4 flex flex-wrap gap-2 px-1 text-[13px] text-slate-500">
          <span>Terms of Service</span>
          <span>Privacy Policy</span>
          <span>© 2026 Gemini Space</span>
        </footer>
      </div>
    </aside>
  )
}

export default React.memo(RightPanel)
