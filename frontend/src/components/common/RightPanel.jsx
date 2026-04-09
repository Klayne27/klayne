import React from "react"
import SearchPanel from "./SearchPanel"
import SuggestedUsersPanel from "./SuggestedUsersPanel"
import FloatingPomodoroTimer from "../../features/pomodoro/components/FloatingPomodoroTimer"
import { useLocation } from "react-router-dom"
// import { usePomodoroTimerStore } from "../../store/usePomodoroTimerStore"

const RightPanel = () => {
  const { pathname } = useLocation()
  const isOnPomodoroPage = pathname === "/pomodoro"
  // const isActive = usePomodoroTimerStore((s) => s.isActive)

  return (
    <div className="sticky top-0 hidden h-[100vh] w-[380px] flex-col border-l border-accent px-4 pt-4 lg:flex">
      <SearchPanel />
      <SuggestedUsersPanel />
      {!isOnPomodoroPage && <FloatingPomodoroTimer />}
    </div>
  )
}

export default React.memo(RightPanel)
