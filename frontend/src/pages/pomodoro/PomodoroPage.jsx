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
import LeftDropdown from "../../features/pomodoro/components/LeftDropdown"
import RightDropdown from "../../features/pomodoro/components/RightDropdown"
import PomodoroTimerDisplay from "../../features/pomodoro/components/PomodoroTimerDisplay"
import PomodoroTimerControls from "../../features/pomodoro/components/PomodoroTimerControls"
import { getPriorityColor, getTextColor } from "../../utils/todoUtils"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { FaFlag } from "react-icons/fa"
import { IoClose } from "react-icons/io5"
import { useGetPomodoroSettings } from "../../features/pomodoro/pomodoroHooks/usePomodoroQueries"
import { useCompleteTodo } from "../../features/todos/todoHooks/useTodoMutations"
import { useGetUserTodoLists } from "../../features/todos/todoListHooks/useTodoListQueries"
import { usePomodoroTimerStore, STORAGE_KEYS } from "../../store/usePomodoroTimerStore"
import QuickTaskPanel from "../../features/pomodoro/components/QuickTaskPanel"
import { useTodoStore } from "../../store/useTodoStore"
import CreateTodoListModal from "../../features/todos/components/CreateTodoListModal"

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

  // ── Local UI state ────────────────────────────────────────────────────────
  const [visuallyCompleted, setVisuallyCompleted] = useState({})
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [milestoneLevel, setMilestoneLevel] = useState(null)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [isRightDropdownOpen, setIsRightDropdownOpen] = useState(false)
  const [isLeftDropdownOpen, setIsLeftDropdownOpen] = useState(false)
  const [showResetTimerModal, setShowResetTimerModal] = useState(false)
  const [showResetCurrentSessionModal, setShowResetCurrentSessionModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const alarmAudioRef = useRef(null)

    const { showCreateTodoListModal, setShowCreateTodoListModal } = useTodoStore()
  

  // ── Todos ─────────────────────────────────────────────────────────────────
  const { myTodoLists, myListsLoading } = useGetUserTodoLists()

  const allTodos = useMemo(
    () =>
      myTodoLists?.pages?.flatMap((page) => page.data.flatMap((todoList) => todoList.todos)) ?? [],
    [myTodoLists],
  )

  const filteredTasks = useMemo(
    () =>
      allTodos.filter(
        (task) =>
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.listName.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [allTodos, searchQuery],
  )

  const selectedTask = allTodos.find((task) => task._id === selectedTaskId)
  const isVisuallyCompleted = visuallyCompleted[selectedTask?._id] || selectedTask?.completed

  const { completeTodo } = useCompleteTodo()

  // ── handleStart ───────────────────────────────────────────────────────────
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
      // Fix: commit the settings value (minutes), never the remaining timer seconds
      if (!isBreak && engineActions.committedSessionDurationRef) {
        engineActions.committedSessionDurationRef.current = settings.sessionDuration
      }
    }

    // Pass settings.sessionDuration so persistStart writes the right value to localStorage
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

  // ── handlePause ───────────────────────────────────────────────────────────
  const handlePause = useCallback(() => {
    if (!isActive) return
    setIsActive(false)
    persistPause(timer)
  }, [isActive, timer, setIsActive, persistPause])

  // ── handleReset — full reset ──────────────────────────────────────────────
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

  // ── handleResetCurrent — reset only the current phase ────────────────────
  const handleResetCurrent = useCallback(() => {
    if (!settings) return
    setIsActive(false)

    const isLongBreak =
      isBreak &&
      sessionCount > 0 &&
      settings.sessionsBeforeLongBreak > 0 &&
      sessionCount % settings.sessionsBeforeLongBreak === 0

    const resetDuration = isBreak
      ? (isLongBreak ? settings.longBreakDuration : settings.shortBreakDuration) * 60
      : settings.sessionDuration * 60

    setTimer(resetDuration)
    localStorage.setItem(STORAGE_KEYS.PAUSED_TIME, resetDuration)
    localStorage.setItem(STORAGE_KEYS.ACTIVE, "false")
    localStorage.removeItem(STORAGE_KEYS.START_TIMESTAMP)
    localStorage.removeItem(STORAGE_KEYS.DURATION_AT_START)
    localStorage.removeItem(STORAGE_KEYS.COMMITTED_DURATION)

    showAppToast("Current timer reset!", "success")
    setShowResetCurrentSessionModal(false)
  }, [settings, isBreak, sessionCount, setIsActive, setTimer])

  // ── handleSkipBreak ───────────────────────────────────────────────────────
  const handleSkipBreak = useCallback(() => {
    if (!isBreak) return
    setIsActive(false)
    engineActions?.startNextTimer(true, sessionCount, false)
    showAppToast("Break skipped!", "info")
  }, [isBreak, sessionCount, setIsActive, engineActions])

  // ── handleSessionEndManual — forward button ───────────────────────────────
  const handleSessionEndManual = useCallback(() => {
    if (engineActions?.isEndingSessionRef) {
      engineActions.isEndingSessionRef.current = false
    }
    engineActions?.handleSessionEnd()
  }, [engineActions])

  // ── Todo completion ───────────────────────────────────────────────────────
  const handleComplete = useCallback(
    (todoId, e) => {
      e.stopPropagation()
      if (!selectedTask || selectedTask.user !== authUser._id || isVisuallyCompleted) return

      showAppToast("Todo completed! ✨", "success")
      setVisuallyCompleted((prev) => ({ ...prev, [todoId]: true }))
      completeTodo(todoId)

      const completedIndex = allTodos.findIndex((t) => t._id === todoId)
      const nextTask = allTodos[completedIndex + 1]
      setSelectedTaskId(nextTask?._id ?? null)
    },
    [selectedTask, authUser, isVisuallyCompleted, allTodos, completeTodo, setSelectedTaskId],
  )

  // ── Dropdown toggles ──────────────────────────────────────────────────────
  const toggleRightDropdown = (e) => {
    e.stopPropagation()
    setIsRightDropdownOpen((o) => !o)
  }
  const toggleLeftDropdown = (e) => {
    e.stopPropagation()
    setIsLeftDropdownOpen((o) => !o)
  }

  const handleOpenSettingsPage = () => {
    if (isMobile) navigate("/pomodoro-settings")
    else setIsSettingsOpen(true)
  }

  // ── Loading guard ─────────────────────────────────────────────────────────
  if (isSettingsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <>
      <main className="template container mx-auto flex min-h-screen w-full max-w-2xl animate-fade-in flex-col items-center border-accent bg-base-100 font-sans md:border-x">
        <PomodoroHeader
          showXpGain={showXpGain}
          xpGainedAmount={xpGainedAmount}
          setShowInfoModal={setShowInfoModal}
        />
        <LeftDropdown
          onToggleLeftDropdown={toggleLeftDropdown}
          isLeftDropdownOpen={isLeftDropdownOpen}
        />
        <RightDropdown
          onToggleRightDropdown={toggleRightDropdown}
          isRightDropdownOpen={isRightDropdownOpen}
        />

        {/* ── Timer section ── */}
        <section className="flex min-h-[70dvh] w-full shrink-0 flex-col items-center justify-center gap-6 py-10">
          {!isMobile && (
            <h1
              className={`text-3xl font-bold tracking-wider ${
                isBreak ? "text-teal-300" : "text-primary"
              }`}
            >
              {isGoalReached ? "Finished" : isBreak ? "Break Time" : "Focus Time"}
            </h1>
          )}

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
          />

          <PomodoroTimerControls
            onOpenSettingsPage={handleOpenSettingsPage}
            isGoalReached={isGoalReached}
            isActive={isActive}
            onPause={handlePause}
            onStart={handleStart}
            timer={timer}
            onResetTimerClick={() => setShowResetTimerModal(true)}
          />

          {/* ── Active task banner ── */}
          <div className="w-full max-w-sm">
            {selectedTask ? (
              <div
                className={`ring-current/20 flex items-center gap-3 rounded-2xl border border-white/5 bg-base-200/50 p-4 ring-1 backdrop-blur-sm transition-all duration-300`}
              >
                <button
                  onClick={(e) => handleComplete(selectedTask._id, e)}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all hover:scale-110 ${getPriorityColor(selectedTask.priority)}`}
                  title="Mark complete"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Focusing on
                  </p>
                  <p className="truncate text-sm font-bold">{selectedTask.title}</p>
                </div>
                <button
                  onClick={() => setSelectedTaskId(null)}
                  className="shrink-0 text-slate-500 transition-colors hover:text-red-400"
                >
                  <IoClose size={18} />
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-700/60 py-4 text-center">
                <p className="text-xs italic text-slate-600">Select a task below to focus on it</p>
              </div>
            )}
          </div>
        </section>

        {/* ── Divider ── */}
        <div className="flex w-full items-center gap-4 px-6 py-2">
          <div className="h-px flex-1 bg-slate-800" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
            Your Tasks
          </span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        {/* ── Quick task panel ── */}
        <QuickTaskPanel
          visuallyCompleted={visuallyCompleted}
          setVisuallyCompleted={setVisuallyCompleted}
        />
      </main>

      {/* ── Modals ── */}
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
          message="Are you sure you want to reset the current session's timer?"
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
          message="Are you sure you want to reset the timer?"
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
