import { useState, useCallback, useMemo, useRef, useEffect } from "react"
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
import PomodoroTasksList from "../../features/pomodoro/components/PomodoroTaskList"
import { getPriorityColor, getTextColor } from "../../utils/todoUtils"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { FaFlag } from "react-icons/fa"
import { IoClose } from "react-icons/io5"
import { useGetPomodoroSettings } from "../../features/pomodoro/pomodoroHooks/usePomodoroQueries"
import { useCompleteTodo } from "../../features/todos/todoHooks/useTodoMutations"
import { useGetUserTodoLists } from "../../features/todos/todoListHooks/useTodoListQueries"
import { usePomodoroTimerStore, STORAGE_KEYS } from "../../store/usePomodoroTimerStore"

const PomodoroPage = () => {
  const navigate = useNavigate()
  const { authUser } = useAuthUser()
  const { settings, isSettingsLoading } = useGetPomodoroSettings()
  const isMobile = useIsMobile()
  const { xpGainedAmount, showXpGain } = useXpStore()

  // ── Global timer state from store (owned by PomodoroTimerEngine) ──────────
  const timer = usePomodoroTimerStore((s) => s.timer)
  const isActive = usePomodoroTimerStore((s) => s.isActive)
  const isBreak = usePomodoroTimerStore((s) => s.isBreak)
  const sessionCount = usePomodoroTimerStore((s) => s.sessionCount)
  const isGoalReached = usePomodoroTimerStore((s) => s.isGoalReached)
  const selectedTaskId = usePomodoroTimerStore((s) => s.selectedTaskId)

  const setTimer = usePomodoroTimerStore((s) => s.setTimer)
  const setIsActive = usePomodoroTimerStore((s) => s.setIsActive)
  const setIsBreak = usePomodoroTimerStore((s) => s.setIsBreak)
  const setSessionCount = usePomodoroTimerStore((s) => s.setSessionCount)
  const setIsGoalReached = usePomodoroTimerStore((s) => s.setIsGoalReached)
  const setSelectedTaskId = usePomodoroTimerStore((s) => s.setSelectedTaskId)

  const persistStart = usePomodoroTimerStore((s) => s.persistStart)
  const persistPause = usePomodoroTimerStore((s) => s.persistPause)
  const persistReset = usePomodoroTimerStore((s) => s.persistReset)

  // ── Local UI-only state ───────────────────────────────────────────────────
  const [visuallyCompleted, setVisuallyCompleted] = useState({})
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [showTodoDropdown, setShowTodoDropdown] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [milestoneLevel, setMilestoneLevel] = useState(null)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [isRightDropdownOpen, setIsRightDropdownOpen] = useState(false)
  const [isLeftDropdownOpen, setIsLeftDropdownOpen] = useState(false)
  const [showResetTimerModal, setShowResetTimerModal] = useState(false)
  const [showResetCurrentSessionModal, setShowResetCurrentSessionModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Audio ref only for the unlock-on-first-click trick
  const alarmAudioRef = useRef(null)

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

  // ── Helpers that delegate to the global engine ────────────────────────────
  const getEngine = () => window.__pomodoroEngine ?? null

  // ── handleStart — unlocks audio, then hands off to the engine ────────────
  const handleStart = useCallback(() => {
    if (isActive || !settings || timer <= 0 || isGoalReached) return

    // Satisfy browser autoplay policy by interacting with audio on a user gesture
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
    const engine = getEngine()
    if (engine) {
      engine.startTimestampRef.current = now
      engine.durationAtStartRef.current = timer
    }

    persistStart(now, timer, isBreak, sessionCount, selectedTaskId)
    setIsActive(true)
  }, [
    isActive,
    settings,
    timer,
    isGoalReached,
    isBreak,
    sessionCount,
    selectedTaskId,
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

  // ── handleResetCurrent — reset only this phase ────────────────────────────
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

    showAppToast("Current timer reset!", "success")
    setShowResetCurrentSessionModal(false)
  }, [settings, isBreak, sessionCount, setIsActive, setTimer])

  // ── handleSkipBreak — delegates to engine's startNextTimer ────────────────
  const handleSkipBreak = useCallback(() => {
    if (!isBreak) return
    setIsActive(false)
    getEngine()?.startNextTimer(true, sessionCount, false)
    showAppToast("Break skipped!", "info")
  }, [isBreak, sessionCount, setIsActive])

  // ── handleSessionEndManual — "forward" button on the timer display ────────
  const handleSessionEndManual = useCallback(() => {
    getEngine()?.handleSessionEnd()
  }, [])

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

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant",
    })
  }, [])

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
            startNextTimer={(...args) => getEngine()?.startNextTimer(...args)}
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
          <div className="w-full max-w-md px-4">
            {selectedTask ? (
              <div className="flex flex-col items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 opacity-80">
                  Currently Focusing
                </span>
                <div className="gray-shadow flex w-full items-center justify-between rounded-2xl border-l-4 border-primary bg-base-200/60 p-4 backdrop-blur-sm transition-all">
                  <div className="flex flex-1 items-center gap-4 overflow-hidden">
                    <button
                      onClick={(e) => handleComplete(selectedTask._id, e)}
                      className={`group flex size-7 shrink-0 items-center justify-center border-2 ${getPriorityColor(selectedTask.priority)}`}
                      title="Complete Task"
                    ></button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[10px] font-bold uppercase text-primary/80">
                          {selectedTask.listName}
                        </p>
                        {selectedTask.dueDate && (
                          <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[9px] font-medium text-slate-300">
                            📅 {new Date(selectedTask.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <h2 className="break-words text-sm font-bold">{selectedTask.title}</h2>
                      {selectedTask.description && (
                        <p className="break-words text-xs text-slate-400">
                          {selectedTask.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedTaskId(null)}
                    className="ml-3 shrink-0 rounded-lg p-1 text-slate-500 transition-colors duration-200 hover:bg-white/10 hover:text-red-500"
                  >
                    <IoClose size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700 py-6 text-center">
                <p className="text-sm font-medium italic text-slate-500">
                  No task selected. Pick one below!
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── Tasks list section ── */}
        <section className="mt-4 w-full max-w-md px-4 pb-24">
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Your Tasks</h3>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase text-primary">
                {allTodos.length} Total
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="transition-focus w-full rounded-xl border border-slate-800 bg-base-200 px-4 py-3 text-sm focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>

          {myListsLoading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner size="sm" />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredTasks.map((task) => (
                <div
                  key={task._id}
                  onClick={() => setSelectedTaskId(task._id)}
                  className={`group flex cursor-pointer items-center justify-between rounded-xl p-4 transition-all duration-200 ${
                    selectedTaskId === task._id
                      ? "bg-primary/5 shadow-lg shadow-primary/5 ring-2 ring-primary"
                      : "bg-base-200 hover:bg-secondary"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="shrink-0">
                      <FaFlag className={`${getTextColor(task.priority)} text-base`} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="break-words text-sm font-bold">{task.title}</h4>
                      <h4 className="break-words text-xs text-slate-500">{task.description}</h4>
                      <div className="flex items-center gap-2">
                        <p className="text-[9px] font-bold uppercase tracking-tighter text-slate-600">
                          {task.listName}
                        </p>
                        {task.dueDate && (
                          <span className="text-[9px] font-medium text-slate-500">
                            • Due {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {selectedTaskId === task._id && (
                    <div className="ml-2 shrink-0 animate-pulse text-[10px] font-black uppercase text-primary">
                      Active
                    </div>
                  )}
                </div>
              ))}

              {filteredTasks.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-sm text-slate-500">No tasks found matching your search.</p>
                </div>
              )}
            </div>
          )}
        </section>
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

      {showTodoDropdown && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-700/70"
          onClick={() => setShowTodoDropdown(false)}
        >
          <div
            className="mx-2 w-full max-w-md rounded-3xl bg-base-100 p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="ml-1 text-xl font-bold">Choose a Task</h3>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setSelectedTaskId(null)
                    setShowTodoDropdown(false)
                  }}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-primary transition-colors duration-200 hover:bg-primary hover:text-white"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowTodoDropdown(false)}
                  className="rounded-full p-2 text-sm font-semibold text-slate-500 transition-colors duration-200 hover:bg-slate-700 hover:text-white"
                >
                  <IoClose size={20} />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <PomodoroTasksList
                isOpen={showTodoDropdown}
                tasks={allTodos}
                isLoading={myListsLoading}
                selectedTaskId={selectedTaskId}
                setSelectedTaskId={(taskId) => {
                  setSelectedTaskId(taskId)
                  setShowTodoDropdown(false)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default PomodoroPage
