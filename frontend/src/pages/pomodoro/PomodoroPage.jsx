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
import QuoteWidget from "../../features/pomodoro/components/QuoteWidget"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { useGetPomodoroSettings } from "../../features/pomodoro/pomodoroHooks/usePomodoroQueries"
import {
  usePauseSession,
  useSelectTask,
  useStartSession,
} from "../../features/pomodoro/pomodoroHooks/usePomodoroMutations"
import { useCompleteTodo } from "../../features/todos/todoHooks/useTodoMutations"
import { useGetUserTodoLists } from "../../features/todos/todoListHooks/useTodoListQueries"
import { useIsMobile } from "../../hooks/customHooks/useIsMobile"
import { usePomodoroTimerStore, STORAGE_KEYS } from "../../store/usePomodoroTimerStore"
import { useTodoStore } from "../../store/useTodoStore"
import useXpStore from "../../store/useXpStore"
import { showAppToast } from "../../utils/showAppToast"
import { getPriorityColor } from "../../utils/todoUtils"
import { formatSuggestedDate } from "../../hooks/customHooks/useDateRecognition"
import { useSound } from "../../hooks/customHooks/useSound"
import { FaCheckCircle } from "react-icons/fa"
import { POMODORO_PRESETS } from "../../constants/pomodoroPresets"
import PomodoroBackground from "../../features/pomodoro/components/PomodoroBackground"

const getTimerState = (isGoalReached, isBreak, sessionCount, settings) => {
  if (isGoalReached) {
    return { label: "Finished!", color: "text-slate-400", glow: "rgba(100,116,139,0.15)" }
  }
  if (!isBreak) {
    return { label: "Focus Time", color: "text-primary", glow: "oklch(var(--p) / 0.15)" }
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
  const { pauseServerSession, cancelServerSession } = usePauseSession()
  const isMobile = useIsMobile()
  const { xpGainedAmount, showXpGain } = useXpStore()

  const [completingId, setCompletingId] = useState(null)

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

  const { play: playPlay } = useSound("/sounds/click-001.mp3", 1)
  const { play: playClick } = useSound("/sounds/click-004.mp3", 1)
  const { play: playComplete } = useSound("/sounds/confirmation-003.mp3", 0.6)

  const timerState = getTimerState(isGoalReached, isBreak, sessionCount, settings)

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [milestoneLevel] = useState(null)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [showResetTimerModal, setShowResetTimerModal] = useState(false)
  const [showResetCurrentSessionModal, setShowResetCurrentSessionModal] = useState(false)

  const alarmAudioRef = useRef(null)
  const { showCreateTodoListModal, setShowCreateTodoListModal } = useTodoStore()

  const selectTask = useSelectTask()

  const { myTodoLists } = useGetUserTodoLists()
  const allTodos = useMemo(
    () => myTodoLists?.pages?.flatMap((page) => page.data.flatMap((list) => list.todos)) ?? [],
    [myTodoLists],
  )

  const selectedTask = allTodos.find((todo) => todo._id === selectedTaskId) ?? null

  const selectedTaskIdIsStale = selectedTaskId && allTodos.length > 0 && !selectedTask
  if (selectedTaskIdIsStale) {
    setSelectedTaskId(null)
  }

  const backgroundUrl = useMemo(() => {
    if (authUser?.pomodoroBackgroundUrl && authUser.pomodoroBackgroundUrl !== "pending") {
      return authUser.pomodoroBackgroundUrl
    }
    if (authUser?.pomodoroBackground) {
      return POMODORO_PRESETS.find((p) => p.key === authUser.pomodoroBackground)?.path ?? null
    }
    return null
  }, [authUser?.pomodoroBackground, authUser?.pomodoroBackgroundUrl])


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

      playPlay()

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
    playPlay
  ])

  const handlePause = useCallback(() => {
    if (!isActive) return
    setIsActive(false)
    playPlay()
    persistPause(timer)
    pauseServerSession({ remainingSeconds: timer })
  }, [isActive, pauseServerSession, persistPause, setIsActive, timer, playPlay])

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

      // 1. Play Sound
      playComplete()

      // 2. Trigger local animation state
      setCompletingId(todoId)

      // 3. Delay the actual cache removal so animation can play
      setTimeout(() => {
        const task = allTodos.find((t) => t._id === todoId)
        if (!task || task.user !== authUser._id) {
          setCompletingId(null)
          return
        }

        completeTodo(todoId)

        if (selectedTaskId === todoId) {
          const currentIndex = allTodos.findIndex((t) => t._id === todoId)
          const next = allTodos.slice(currentIndex + 1).find((t) => !t.completed)
          selectTask(next?._id ?? null)
        }

        setCompletingId(null)
      }, 400) // Match this with the CSS duration
    },
    [allTodos, authUser, completeTodo, selectTask, selectedTaskId, playComplete],
  )

  const handleOpenSettingsPage = () => {
    playClick()
    if (isMobile) navigate("/pomodoro-settings")
    else setIsSettingsOpen(true)
    
  }

  const handleResetTimerClick = () => {
    playClick()
    setShowResetTimerModal(true)
  }

    const isBackgroundPicked = authUser?.pomodoroBackgroundUrl || authUser.pomodoroBackground


  if (isSettingsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <>
      <PomodoroBackground bgUrl={backgroundUrl} />
      <main
        className="template flex min-h-screen w-full flex-col items-center border-accent bg-base-100 pb-28 font-sans md:pb-10"
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

        <div className="relative w-full xl:grid xl:min-h-[75dvh] xl:grid-cols-[400px_1fr_400px] xl:items-center">
          {/* ── Quote widget — left rail, desktop only ── */}
          <div className="hidden xl:block" />
          {/* ── Timer + controls — always centred ── */}
          <section className="flex min-h-[75dvh] w-full shrink-0 flex-col items-center justify-center gap-8 py-10 transition-all duration-1000 xl:min-h-0">
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
              onResetTimerClick={handleResetTimerClick}
            />

            {/* ── Active task banner ── */}
            <div className="w-full max-w-xl px-6">
              {selectedTask && !selectedTask.completed ? (
                <div
                  className={`group flex items-center gap-4 rounded-3xl border border-accent/50 bg-white/[0.03] p-2 pr-4 shadow-xl ring-1 ring-white/5 backdrop-blur-sm transition-all duration-500 ${completingId === selectedTask._id ? "translate-x-4 skew-x-2 scale-95 opacity-0" : "scale-100 opacity-100"} `}
                >
                  <button
                    onClick={(event) => handleComplete(selectedTask._id, event)}
                    disabled={completingId === selectedTask._id}
                    className={`flex size-6 shrink-0 items-center justify-center rounded-2xl border-2 shadow-inner transition-all hover:scale-110 active:scale-90 ${getPriorityColor(selectedTask.priority)} ${completingId === selectedTask._id ? "animate-ping" : ""} `}
                  >
                    {completingId && (
                      <FaCheckCircle className="absolute inset-0 size-5 animate-pulse text-success" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                        {completingId === selectedTask._id ? "Mission Accomplished" : "Focusing"}
                      </p>
                      <span
                        className={`h-1 w-1 rounded-full bg-primary ${completingId === selectedTask._id ? "hidden" : "animate-pulse"}`}
                      />
                    </div>
                    <p
                      className={`duration transition-300 ${isBackgroundPicked ? "text-slate-400" : ""} truncate text-sm font-bold tracking-tight transition-all duration-300 ${completingId === selectedTask._id ? "line-through opacity-50" : ""}`}
                    >
                      {selectedTask.title}
                    </p>
                    {selectedTask.dueDate && (
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                        <span className="opacity-70">Due:</span>
                        <span className="text-slate-400">
                          {new Date(selectedTask.dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        {(() => {
                          const d = new Date(selectedTask.dueDate)
                          const taskHasTime = d.getHours() !== 0 || d.getMinutes() !== 0
                          return <span>{formatSuggestedDate(d, taskHasTime)}</span>
                        })()}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => selectTask(null)}
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
         
          <div className="w-full px-4 pb-2 xl:hidden">
             <QuoteWidget />
        
          </div>
          {/* ── Mirror column — keeps the timer centred ── */}
          <aside className="mt-10 hidden xl:flex xl:flex-col xl:items-center xl:self-stretch mr-12">
            {/* Subtle vertical divider on the right edge of the aside */}
            <div className="relative w-full">
              <div className="absolute left-0 top-1/2 h-32 -translate-y-1/2" />
              <QuoteWidget />
            </div>
          </aside>
        </div>

        <div className="flex w-full items-center gap-4 px-8 py-4 md:mt-20">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
            Tasks
          </span>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-slate-800 via-slate-800 to-transparent" />
        </div>

        <QuickTaskPanel />
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
