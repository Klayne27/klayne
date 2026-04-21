import { useState, useCallback, useMemo, useRef } from "react"
import { useNavigate } from "react-router-dom"

import PomodoroSettingsModal from "../../features/pomodoro/components/PomodoroSettingsModal"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import { showAppToast } from "../../utils/showAppToast"
import PomodoroHeader from "../../features/pomodoro/components/PomodoroHeader"
import { useIsMobile } from "../../hooks/customHooks/useIsMobile"
import MilestoneModal from "../../components/common/MilestoneModal"
import PomodoroInfoModal from "../../features/pomodoro/components/PomodoroInfoModal"
import ConfirmationModal from "../../components/common/ConfirmationModal"
import useXpStore from "../../store/useXpStore"
import FloatingNav from "../../features/pomodoro/components/FloatingNav"
import PomodoroTimerDisplay from "../../features/pomodoro/components/PomodoroTimerDisplay"
import PomodoroTimerControls from "../../features/pomodoro/components/PomodoroTimerControls"
import { getPriorityColor } from "../../utils/todoUtils"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { IoClose } from "react-icons/io5"
import { useGetPomodoroSettings } from "../../features/pomodoro/pomodoroHooks/usePomodoroQueries"
import { useCompleteTodo } from "../../features/todos/todoHooks/useTodoMutations"
import { useGetUserTodoLists } from "../../features/todos/todoListHooks/useTodoListQueries"
import { usePomodoroTimerStore, STORAGE_KEYS } from "../../store/usePomodoroTimerStore"
import QuickTaskPanel from "../../features/pomodoro/components/QuickTaskPanel"
import { useTodoStore } from "../../store/useTodoStore"
import CreateTodoListModal from "../../features/todos/components/CreateTodoListModal"
import { FaCheckCircle } from "react-icons/fa"

// Single source of truth for timer state styling
const getTimerState = (isGoalReached, isBreak, sessionCount, settings) => {
  if (isGoalReached)
    return { label: "Finished!", color: "text-slate-400", glow: "rgba(100,116,139,0.15)" }
 if (!isBreak)
   return {
     label: "Focus Time",
     color: "text-primary",
     glow: "oklch(var(--p) / 0.15)",
   }
  const isLong =
    sessionCount > 0 &&
    settings?.sessionsBeforeLongBreak > 0 &&
    sessionCount % settings.sessionsBeforeLongBreak === 0
  return isLong
    ? { label: "Long Break", color: "text-indigo-400", glow: "rgba(99,102,241,0.18)" }
    : { label: "Short Break", color: "text-teal-400", glow: "rgba(45,212,191,0.18)" }
}

const PomodoroPage = () => {
  const navigate = useNavigate()
  const { authUser } = useAuthUser()
  const { settings, isSettingsLoading } = useGetPomodoroSettings()
  const isMobile = useIsMobile()
  const { xpGainedAmount, showXpGain } = useXpStore()

  // ── Global timer state ────────────────────────────────────────────────────
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
  const persistStart = usePomodoroTimerStore((s) => s.persistStart)
  const persistPause = usePomodoroTimerStore((s) => s.persistPause)
  const persistReset = usePomodoroTimerStore((s) => s.persistReset)

  const timerState = getTimerState(isGoalReached, isBreak, sessionCount, settings)

  // ── Local UI state ────────────────────────────────────────────────────────
  const [visuallyCompleted, setVisuallyCompleted] = useState({})
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [milestoneLevel, setMilestoneLevel] = useState(null)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [showResetTimerModal, setShowResetTimerModal] = useState(false)
  const [showResetCurrentSessionModal, setShowResetCurrentSessionModal] = useState(false)

  const alarmAudioRef = useRef(null)
  const { showCreateTodoListModal, setShowCreateTodoListModal } = useTodoStore()

  const { myTodoLists } = useGetUserTodoLists()
  const allTodos = useMemo(
    () => myTodoLists?.pages?.flatMap((page) => page.data.flatMap((l) => l.todos)) ?? [],
    [myTodoLists],
  )

  const selectedTask = allTodos.find((t) => t._id === selectedTaskId)
  const isVisuallyCompleted = visuallyCompleted[selectedTask?._id] || selectedTask?.completed
  const { completeTodo } = useCompleteTodo()

  // ── Handlers ──────────────────────────────────────────────────────────────
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
    const now = Date.now()
    if (engineActions) {
      engineActions.startTimestampRef.current = now
      engineActions.durationAtStartRef.current = timer
      if (!isBreak && engineActions.committedSessionDurationRef) {
        engineActions.committedSessionDurationRef.current = settings.sessionDuration
      }
    }
    persistStart(
      now,
      timer,
      isBreak,
      sessionCount,
      selectedTaskId,
      !isBreak ? settings.sessionDuration : null,
    )
    setIsActive(true)
  }, [
    isActive,
    settings,
    timer,
    isGoalReached,
    isBreak,
    sessionCount,
    selectedTaskId,
    engineActions,
    persistStart,
    setIsActive,
  ])

  const handlePause = useCallback(() => {
    if (!isActive) return
    setIsActive(false)
    persistPause(timer)
  }, [isActive, timer, setIsActive, persistPause])

  const handleReset = useCallback(() => {
    if (!settings) return
    setIsActive(false)
    setTimer(settings.sessionDuration * 60)
    setIsBreak(false)
    setSessionCount(0)
    setIsGoalReached(false)
    setShowResetTimerModal(false)
    persistReset()
  }, [settings, setIsActive, setTimer, setIsBreak, setSessionCount, setIsGoalReached, persistReset])

  const handleResetCurrent = useCallback(() => {
    if (!settings) return
    setIsActive(false)
    const isLong =
      isBreak &&
      sessionCount > 0 &&
      settings.sessionsBeforeLongBreak > 0 &&
      sessionCount % settings.sessionsBeforeLongBreak === 0
    const dur = isBreak
      ? (isLong ? settings.longBreakDuration : settings.shortBreakDuration) * 60
      : settings.sessionDuration * 60
    setTimer(dur)
    localStorage.setItem(STORAGE_KEYS.PAUSED_TIME, dur)
    localStorage.setItem(STORAGE_KEYS.ACTIVE, "false")
    localStorage.removeItem(STORAGE_KEYS.START_TIMESTAMP)
    localStorage.removeItem(STORAGE_KEYS.DURATION_AT_START)
    localStorage.removeItem(STORAGE_KEYS.COMMITTED_DURATION)
    showAppToast("Current timer reset!", "success")
    setShowResetCurrentSessionModal(false)
  }, [settings, isBreak, sessionCount, setIsActive, setTimer])

  const handleSkipBreak = useCallback(() => {
    if (!isBreak) return
    setIsActive(false)
    engineActions?.startNextTimer(true, sessionCount, false)
    showAppToast("Break skipped!", "info")
  }, [isBreak, sessionCount, setIsActive, engineActions])

  const handleSessionEndManual = useCallback(() => {
    if (engineActions?.isEndingSessionRef) engineActions.isEndingSessionRef.current = false
    engineActions?.handleSessionEnd()
  }, [engineActions])

  const handleComplete = useCallback(
    (todoId, e) => {
      e.stopPropagation()
      if (!selectedTask || selectedTask.user !== authUser._id || isVisuallyCompleted) return
      showAppToast("Todo completed! ✨", "success")
      setVisuallyCompleted((prev) => ({ ...prev, [todoId]: true }))
      completeTodo(todoId)
      const idx = allTodos.findIndex((t) => t._id === todoId)
      setSelectedTaskId(allTodos[idx + 1]?._id ?? null)
    },
    [selectedTask, authUser, isVisuallyCompleted, allTodos, completeTodo, setSelectedTaskId],
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
        className="template container mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center border-accent bg-base-100 font-sans md:border-x"
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

        {/* ── Timer section: Card removed for a "floating" feel ── */}
        <section className="flex min-h-[75dvh] w-full shrink-0 flex-col items-center justify-center gap-8 py-10 transition-all duration-1000">
          {/* State label - more minimalist */}
          <div className="flex items-center gap-2">
            <div
              className={`size-2 rounded-full ${isActive && !isGoalReached ? "animate-ping" : ""} bg-current ${timerState.color}`}
            />
            <h1
              className={`text-sm font-black uppercase tracking-[0.4em] transition-colors duration-700 ${timerState.color} opacity-80`}
            >
              {timerState.label}
            </h1>
          </div>

          {/* Floating Display - The card is gone, shadow is now a glow behind the SVG */}
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

          {/* Active task banner: Cleaner glass design */}
          <div className="w-full max-w-sm px-6">
            {selectedTask ? (
              <div className="group flex items-center gap-4 rounded-3xl border border-accent/50 bg-white/[0.03] p-2 pr-4 shadow-xl ring-1 ring-white/5 backdrop-blur-md">
                <button
                  onClick={(e) => handleComplete(selectedTask._id, e)}
                  className={`flex size-6 shrink-0 items-center justify-center rounded-2xl border-2 shadow-inner transition-all hover:scale-105 ${getPriorityColor(selectedTask.priority)}`}
                >
                  {/* <FaCheckCircle
                    size={14}
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                  /> */}
                </button>
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

        {/* Task List Section */}
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

      {/* Modals */}
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
