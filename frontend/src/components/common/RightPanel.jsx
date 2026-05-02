import React from "react"
import SearchPanel from "./SearchPanel"
import SuggestedUsersPanel from "./SuggestedUsersPanel"
import FloatingPomodoroTimer from "../../features/pomodoro/components/FloatingPomodoroTimer"
import { useLocation } from "react-router-dom"
import TrendingTagsPanel from "./TrendingTagsPanel"

// Pages where trending tags are contextually useful
const TRENDING_ROUTES = ["/", "/ic", "/vent", "/explore"]

const RightPanel = () => {
  const { pathname } = useLocation()
  const isOnPomodoroPage = pathname === "/pomodoro"

  // Show on feed-like pages and on hashtag pages themselves
  const showTrending = TRENDING_ROUTES.includes(pathname) || pathname.startsWith("/hashtag")

  return (
    <div className="sticky top-0 hidden h-[100vh] w-[380px] flex-col overflow-y-auto border-l border-accent px-4 pt-4 lg:flex">
      <SearchPanel />
      <TrendingTagsPanel />
      <SuggestedUsersPanel />
      {!isOnPomodoroPage && <FloatingPomodoroTimer />}
    </div>
  )
}

export default React.memo(RightPanel)
