import React, { useRef, useEffect } from "react"
import SearchPanel from "./SearchPanel"
import SuggestedUsersPanel from "./SuggestedUsersPanel"
import FloatingPomodoroTimer from "../../features/pomodoro/components/FloatingPomodoroTimer"
import { useLocation } from "react-router-dom"
import TrendingTagsPanel from "./TrendingTagsPanel"

const RightPanel = () => {
  const { pathname } = useLocation()
  const isOnPomodoroPage = pathname === "/pomodoro"
  const showTrending = pathname.startsWith("/trending")

  const panelRef = useRef(null)

  useEffect(() => {
    const syncScroll = () => {
      const el = panelRef.current
      if (!el) return
      // Cap at the panel's own scrollable range so it stops when everything is visible
      const maxScroll = el.scrollHeight - el.clientHeight
      el.scrollTop = Math.min(window.scrollY, maxScroll)
    }

    window.addEventListener("scroll", syncScroll, { passive: true })
    // Sync immediately in case the page was already scrolled (e.g. back-navigation)
    syncScroll()
    return () => window.removeEventListener("scroll", syncScroll)
  }, [])

  return (
    // overflow-hidden on the aside so nothing bleeds out; all scrolling
    // happens inside panelRef which has its own overflow-y: auto
    <aside className="sticky top-0 hidden h-screen w-[380px] flex-shrink-0 overflow-hidden pl-7 lg:flex lg:flex-col">
      <div
        ref={panelRef}
        className="flex h-full w-full flex-col overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/*
         * sticky top-0 here is relative to this scroll container, not the window.
         * So as the panel scrolls down, the search bar stays pinned at the top
         * of the panel's visible area — exactly like Twitter.
         */}
        <div className="sticky top-0 z-10 bg-base-100/80 pb-1 pt-1 backdrop-blur-md">
          <SearchPanel />
        </div>

        {/* Everything below the search bar scrolls normally within the panel */}
        <div className="flex flex-col pb-10">
          {!isOnPomodoroPage && <FloatingPomodoroTimer />}
          {showTrending ? (
            <div className="mb-4 mt-3 border-t border-accent" />
          ) : (
            <TrendingTagsPanel />
          )}
          <SuggestedUsersPanel />

          {/* <footer className="mt-6 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[12px] text-slate-500">
            <span>Terms of Service</span>
            <span>Privacy Policy</span>
            <span>Cookie Policy</span>
            <span className="w-full">© 2026 Klayne</span>
          </footer> */}
        </div>
      </div>
    </aside>
  )
}

export default React.memo(RightPanel)
