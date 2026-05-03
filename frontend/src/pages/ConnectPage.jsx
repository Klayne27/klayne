import { useEffect, useState, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useIsMobile } from "../hooks/customHooks/useIsMobile"
import TrendingPage from "./TrendingPage"
import SuggestedUsersPage from "./SuggestedUsersPage"
import SearchPanel from "../components/common/SearchPanel"
import { FaArrowLeft } from "react-icons/fa"

const ConnectPage = () => {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const activeTab = pathname.startsWith("/trending") ? "trending" : "people"

  // ── Scroll-hide logic ─────────────────────────────────────────────────────
  // Must exactly mirror the sidebar's scroll handler so both elements animate
  // in sync:
  //   • hide when scrolling DOWN past 50 px from the top
  //   • show when scrolling UP (any amount)
  //   • always show when within 50 px of the top (matches sidebar threshold)
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    if (!isMobile) return // desktop — header is always visible

    const handleScroll = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        // Scrolling down past threshold → hide (matches sidebar: currentScrollY > 50)
        setIsVisible(false)
      } else if (currentScrollY < lastScrollY.current) {
        // Scrolling up → show
        setIsVisible(true)
      }
      // No update when scrollY === lastScrollY (momentum micro-jitter)

      lastScrollY.current = currentScrollY
    }

    // Initialise ref so the first scroll event has a correct baseline
    lastScrollY.current = window.scrollY

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [isMobile])

  // ── Desktop: render the individual page directly (no tab chrome) ──────────
  if (!isMobile) {
    return activeTab === "trending" ? <TrendingPage /> : <SuggestedUsersPage />
  }

  // ── Mobile: shared header + tab-switched content ──────────────────────────
  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <div
        className={`sticky top-0 z-10 border-b border-accent bg-base-100/80 backdrop-blur transition-transform duration-300 ease-in-out ${
          isVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        {/* Row 1: back button + search */}
        <div className="flex min-w-0 items-center gap-2 overflow-x-hidden px-2.5 py-2">
          <button
            onClick={() => navigate(-1)}
            // ADD: shrink-0 so the back button never gets squeezed
            className="shrink-0 rounded-full p-2.5 transition duration-200 hover:bg-secondary/40"
          >
            <FaArrowLeft size={16} />
          </button>
          {/* SearchPanel is now flex-1 + min-w-0 internally, so it fills remaining space */}
          <SearchPanel />
        </div>

        {/* Row 2: tabs — same style as HomePage */}
        <div className="flex">
          <button
            className={`relative flex flex-1 items-center justify-center py-3 text-sm transition hover:bg-secondary/30 ${
              activeTab === "people" ? "font-bold" : "text-base-content/50"
            }`}
            onClick={() => navigate("/suggested-users")}
          >
            For You
            {activeTab === "people" && (
              <span className="absolute bottom-0 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-primary" />
            )}
          </button>

          <button
            className={`relative flex flex-1 items-center justify-center py-3 text-sm transition hover:bg-secondary/30 ${
              activeTab === "trending" ? "font-bold" : "text-base-content/50"
            }`}
            onClick={() => navigate("/trending")}
          >
            Trending
            {activeTab === "trending" && (
              <span className="absolute bottom-0 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-primary" />
            )}
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "people" ? <SuggestedUsersPage mobile /> : <TrendingPage mobile />}
    </div>
  )
}

export default ConnectPage
