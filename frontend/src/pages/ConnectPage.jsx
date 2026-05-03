import { useEffect, useState, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useIsMobile } from "../hooks/customHooks/useIsMobile"
import TrendingPage from "./TrendingPage"
import SuggestedUsersPage from "./SuggestedUsersPage"
import SearchPanel from "../components/common/SearchPanel"
import { FaArrowLeft } from "react-icons/fa"
import { useAppStore } from "../store/useAppStore"

const ConnectPage = () => {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const activeTab = pathname.startsWith("/trending") ? "trending" : "people"

  const setShowResults = useAppStore((s) => s.setShowResults)

  const [isVisible, setIsVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    if (!isMobile) return
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsVisible(false)
        setShowResults(false)
      } else if (currentScrollY < lastScrollY.current) {
        setIsVisible(true)
      }
      lastScrollY.current = currentScrollY
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [isMobile, setShowResults])

  if (!isMobile) {
    return activeTab === "trending" ? <TrendingPage /> : <SuggestedUsersPage />
  }

  return (
    <div className="min-h-screen w-full">
      <div
        className={`sticky top-0 z-50 border-b border-accent bg-base-100/80 backdrop-blur transition-transform duration-300 ease-in-out ${
          isVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        {/* Row 1: Back button + Search */}
        {/* REMOVED: overflow-x-hidden (This was clipping your dropdown) */}
        <div className="relative z-30 flex items-center gap-2 px-2.5 py-2">
          <button
            onClick={() => navigate(-1)}
            className="flex-shrink-0 rounded-full p-2 transition duration-200 hover:bg-secondary/40"
          >
            <FaArrowLeft size={18} />
          </button>

          {/* SearchPanel is flex-1 and min-w-0 to stay within bounds */}
          <div className="min-w-0 flex-1">
            <SearchPanel />
          </div>
        </div>

        {/* Row 2: Tabs */}
        <div className="relative z-20 flex bg-transparent">
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

      <div className="flex flex-col">
        {activeTab === "people" ? <SuggestedUsersPage mobile /> : <TrendingPage mobile />}
      </div>
    </div>
  )
}

export default ConnectPage
