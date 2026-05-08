import { useCallback, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { IoClose } from "react-icons/io5"

import ConfirmationModal from "../../components/common/ConfirmationModal"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import MilestoneModal from "../../components/common/MilestoneModal"
import CreateTodoListModal from "../../features/todos/components/CreateTodoListModal"
import FloatingNav from "../../features/pomodoro/components/FloatingNav"
import PomodoroHeader from "../../features/pomodoro/components/PomodoroHeader"
import PomodoroInfoModal from "../../features/pomodoro/components/PomodoroInfoModal"
import PomodoroSettingsModal from "../../features/pomodoro/components/PomodoroSettingsModal"
import PomodoroTimerControls from "../../features/pomodoro/components/PomodoroTimerControls"
import PomodoroTimerDisplay from "../../features/pomodoro/components/PomodoroTimerDisplay"
import QuickTaskPanel from "../../features/pomodoro/components/QuickTaskPanel"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { useGetPomodoroSettings } from "../../features/pomodoro/pomodoroHooks/usePomodoroQueries"
import { usePauseSession, useStartSession } from "../../features/pomodoro/pomodoroHooks/usePomodoroMutations"
import { useCompleteTodo } from "../../features/todos/todoHooks/useTodoMutations"
import { useGetUserTodoLists } from "../../features/todos/todoListHooks/useTodoListQueries"
import { useIsMobile } from "../../hooks/customHooks/useIsMobile"
import { usePomodoroTimerStore } from "../../store/usePomodoroTimerStore"
import { useTodoStore } from "../../store/useTodoStore"
import useXpStore from "../../store/useXpStore"
import { showAppToast } from "../../utils/showAppToast"
import { getPriorityColor } from "../../utils/todoUtils"

const getTimerState = (isGoalReached, isBreak, sessionCount, settings) => {
  if (isGoalReached) {
    return { label: "Finished!", color: "text-slate-400", glow: "rgba(100,116,139,0.15)" }
  }

  if (!isBreak) {
    return {
      label: "Focus Time",
      color: "text-primary",
      glow: "oklch(var(--p) / 0.15)",
    }
  }

  const isLongBreak =
    sessionCount > 0 &&
    settings?.sessionsBeforeLongBreak > 0 &&
    sessionCount % settings.sessionsBeforeLongBreak === 0

  return isLongBreak
    ? { label: "Long Break", color: "text-indigo-400", glow: "rgba(99,102,241,0.18)" }
    : { label: "Short Break", color: "text-teal-400", glow: "rgba(45,212,191,0.18)" }
}

const getCurrentPhaseDurationMinutes = (settings, isBreak, sessionCount) => {
  if (!settings) return 0
  if (!isBreak) return settings.sessionDuration

  const isLongBreak =
    sessionCount > 0 &&
    settings.sessionsBeforeLongBreak > 0 &&
    sessionCount % settings.sessionsBeforeLongBreak === 0

  return isLongBreak ? settings.longBreakDuration : settings.shortBreakDuration
}

const PomodoroPage = () => {
  const navigate = useNavigate()
  const { authUser } = useAuthUser()
  const { settings, isSettingsLoading } = useGetPomodoroSettings()
  const { startSession } = useStartSession()
  const { cancelServerSession } = usePauseSession()
  const isMobile = useIsMobile()
  const { xpGainedAmount, showXpGain } = useXpStore()

  const timer = usePomodoroTimerStore((s) => s.timer)
  const isActive = usePomodoroTimerStore((s) => s.isActive)
  const isBreak = usePomodoroTimerStore((s) => s.isBreak)
  const sessionCount = usePomodoroTimerStore((s) => s.sessionCount)
  const isGoalReached = usePomodoroTimerStore((s) => s.isGoalReached)
  const selectedTaskId = usePomodoroTimerStore((s) => s.selectedTaskId)
  const engineActions = usePomodoroTimerStore((s) => s.engineActions)

  const setTimer = usePomodoroTimerStore((s) => s.setTimer)
  const setIsActive = usePomodoroTimerStore((s) => s.setIsActive)
  const setIsBreak = usePomodoroTimerStore((s) => s.setIsBreak)
  const setSessionCount = usePomodoroTimerStore((s) => s.setSessionCount)
  const setIsGoalReached = usePomodoroTimerStore((s) => s.setIsGoalReached)
  const setSelectedTaskId = usePomodoroTimerStore((s) => s.setSelectedTaskId)
  const persistPause = usePomodoroTimerStore((s) => s.persistPause)
  const persistReset = usePomodoroTimerStore((s) => s.persistReset)

  const timerState = getTimerState(isGoalReached, isBreak, sessionCount, settings)

  const [visuallyCompleted, setVisuallyCompleted] = useState({})
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [milestoneLevel] = useState(null)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [showResetTimerModal, setShowResetTimerModal] = useState(false)
  const [showResetCurrentSessionModal, setShowResetCurrentSessionModal] = useState(false)

  const alarmAudioRef = useRef(null)
  const { showCreateTodoListModal, setShowCreateTodoListModal } = useTodoStore()

  const { myTodoLists } = useGetUserTodoLists()
  const allTodos = useMemo(
    () => myTodoLists?.pages?.flatMap((page) => page.data.flatMap((list) => list.todos)) ?? [],
    [myTodoLists],
  )

  const selectedTask = allTodos.find((todo) => todo._id === selectedTaskId)
  const isVisuallyCompleted = visuallyCompleted[selectedTask?._id] || selectedTask?.completed
  const { completeTodo } = useCompleteTodo()

  const handleStart = useCallback(() => {
    if (isActive || !settings || timer <= 0 || isGoalReached) return

    if (!alarmAudioRef.current) {
      alarmAudioRef.current = new Audio("/alarm.mp3")
      alarmAudioRef.current.volume = 0.3
    }

    alarmAudioRef.current
      .play()
      .then(() => {
        alarmAudioRef.current.pause()
        alarmAudioRef.current.currentTime = 0
      })
      .catch(() => {})

    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission()
    }

    startSession({
      timerSeconds: timer,
      plannedDurationMinutes: getCurrentPhaseDurationMinutes(settings, isBreak, sessionCount),
      isBreak,
      sessionCount,
      taskId: selectedTaskId || null,
    })
  }, [
    isActive,
    isBreak,
    isGoalReached,
    selectedTaskId,
    sessionCount,
    settings,
    startSession,
    timer,
  ])

  const handlePause = useCallback(() => {
    if (!isActive) return

    setIsActive(false)
    persistPause(timer)
    cancelServerSession()
  }, [cancelServerSession, isActive, persistPause, setIsActive, timer])

  const handleReset = useCallback(() => {
    if (!settings) return

    cancelServerSession()
    setIsActive(false)
    setTimer(settings.sessionDuration * 60)
    setIsBreak(false)
    setSessionCount(0)
    setIsGoalReached(false)
    setShowResetTimerModal(false)
    persistReset()
  }, [
    cancelServerSession,
    persistReset,
    setIsActive,
    setIsBreak,
    setIsGoalReached,
    setSessionCount,
    setTimer,
    settings,
  ])

  const handleResetCurrent = useCallback(() => {
    if (!settings) return

    cancelServerSession()
    setIsActive(false)

    const duration = getCurrentPhaseDurationMinutes(settings, isBreak, sessionCount) * 60
    setTimer(duration)
    persistPause(duration)
    showAppToast("Current timer reset!", "success")
    setShowResetCurrentSessionModal(false)
  }, [cancelServerSession, isBreak, persistPause, sessionCount, setIsActive, setTimer, settings])

  const handleSessionEndManual = useCallback(() => {
    if (!engineActions) return

    if (engineActions.forceEnd) {
      engineActions.forceEnd()
      return
    }

    if (engineActions.isEndingSessionRef) engineActions.isEndingSessionRef.current = false
    engineActions.handleSessionEnd?.()
  }, [engineActions])

  const handleSkipBreak = useCallback(() => {
    handleSessionEndManual()
  }, [handleSessionEndManual])

  const handleComplete = useCallback(
    (todoId, event) => {
      event.stopPropagation()
      if (!selectedTask || selectedTask.user !== authUser._id || isVisuallyCompleted) return

      showAppToast("Todo completed!", "success")
      setVisuallyCompleted((prev) => ({ ...prev, [todoId]: true }))
      completeTodo(todoId)

      const currentIndex = allTodos.findIndex((todo) => todo._id === todoId)
      setSelectedTaskId(allTodos[currentIndex + 1]?._id ?? null)
    },
    [
      allTodos,
      authUser,
      completeTodo,
      isVisuallyCompleted,
      selectedTask,
      setSelectedTaskId,
    ],
  )

  const handleOpenSettingsPage = () => {
    if (isMobile) navigate("/pomodoro-settings")
    else setIsSettingsOpen(true)
  }

  if (isSettingsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <>
      <main
        className="template container mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center border-accent bg-base-100 pb-28 font-sans md:border-x md:pb-10"
        style={{
          background: `radial-gradient(circle at 50% 35%, ${timerState.glow} 0%, transparent 45%)`,
        }}
      >
        <PomodoroHeader
          showXpGain={showXpGain}
          xpGainedAmount={xpGainedAmount}
          setShowInfoModal={setShowInfoModal}
        />

        <FloatingNav />

        <section className="flex min-h-[75dvh] w-full shrink-0 flex-col items-center justify-center gap-8 py-10 transition-all duration-1000">
          <div className="flex items-center gap-2">
            <div
              className={`size-2 rounded-full ${isActive && !isGoalReached ? "animate-ping" : ""} bg-current ${timerState.color}`}
            />
            <h1
              className={`text-sm font-black uppercase tracking-[0.4em] opacity-80 transition-colors duration-700 ${timerState.color}`}
            >
              {timerState.label}
            </h1>
          </div>

          <div className="relative flex flex-col items-center">
            <PomodoroTimerDisplay
              isBreak={isBreak}
              timer={timer}
              setIsActive={setIsActive}
              startNextTimer={(...args) => engineActions?.startNextTimer(...args)}
              sessionCount={sessionCount}
              setShowResetCurrentSessionModal={setShowResetCurrentSessionModal}
              isGoalReached={isGoalReached}
              onSessionEnd={handleSessionEndManual}
              onSkipBreak={handleSkipBreak}
              timerState={timerState}
            />
          </div>

          <PomodoroTimerControls
            onOpenSettingsPage={handleOpenSettingsPage}
            isGoalReached={isGoalReached}
            isActive={isActive}
            onPause={handlePause}
            onStart={handleStart}
            timer={timer}
            onResetTimerClick={() => setShowResetTimerModal(true)}
          />

          <div className="w-full max-w-sm px-6">
            {selectedTask ? (
              <div className="group flex items-center gap-4 rounded-3xl border border-accent/50 bg-white/[0.03] p-2 pr-4 shadow-xl ring-1 ring-white/5 backdrop-blur-md">
                <button
                  onClick={(event) => handleComplete(selectedTask._id, event)}
                  className={`flex size-6 shrink-0 items-center justify-center rounded-2xl border-2 shadow-inner transition-all hover:scale-105 ${getPriorityColor(selectedTask.priority)}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                    Focusing
                  </p>
                  <p className="break-words text-sm font-bold tracking-tight">
                    {selectedTask.title}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTaskId(null)}
                  className="shrink-0 p-2 text-slate-600 transition-colors hover:text-red-400"
                >
                  <IoClose size={18} />
                </button>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-accent/50 py-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-700">
                  No Task Selected
                </p>
              </div>
            )}
          </div>
        </section>

        <div className="mt-4 flex w-full items-center gap-4 px-8 py-4">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
            Tasks
          </span>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-slate-800 via-slate-800 to-transparent" />
        </div>

        <QuickTaskPanel
          visuallyCompleted={visuallyCompleted}
          setVisuallyCompleted={setVisuallyCompleted}
        />
      </main>

      {settings && isSettingsOpen && (
        <PomodoroSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          initialSettings={settings}
        />
      )}
      {showInfoModal && <PomodoroInfoModal onClose={() => setShowInfoModal(false)} />}
      {showShareModal && (
        <MilestoneModal
          level={milestoneLevel}
          onClose={() => setShowShareModal(false)}
          isOpen={showShareModal}
        />
      )}
      {showResetCurrentSessionModal && (
        <ConfirmationModal
          isOpen={showResetCurrentSessionModal}
          onClose={() => setShowResetCurrentSessionModal(false)}
          onConfirm={handleResetCurrent}
          danger={false}
          message="Reset the current phase timer?"
          confirmButtonText="Reset"
          modalTitle="Reset current session"
        />
      )}
      {showResetTimerModal && (
        <ConfirmationModal
          isOpen={showResetTimerModal}
          onClose={() => setShowResetTimerModal(false)}
          onConfirm={handleReset}
          danger={false}
          message="Reset the full timer and session count?"
          confirmButtonText="Reset"
          modalTitle="Reset Timer"
        />
      )}
      {showCreateTodoListModal && (
        <CreateTodoListModal onClose={() => setShowCreateTodoListModal(false)} />
      )}
    </>
  )
}

export default PomodoroPage
