import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"

import PomodoroSettingsModal from "../../features/pomodoro/PomodoroSettingsModal"

import LoadingSpinner from "../../components/common/LoadingSpinner"
import { showAppToast } from "../../utils/showAppToast"
import PomodoroHeader from "../../features/pomodoro/PomodoroHeader"
import { useIsMobile } from "../../hooks/customHooks/useIsMobile"
import MilestoneModal from "../../components/common/MilestoneModal"
import PomodoroInfoModal from "../../features/pomodoro/PomodoroInfoModal"
import ConfirmationModal from "../../components/common/ConfirmationModal"

import { useEndStudySession } from "../../features/pomodoro/pomodoroHooks/useEndStudySession"
import { useGetPomodoroSettings } from "../../features/pomodoro/pomodoroHooks/useGetPomodoroSettings"
import useXpStore from "../../store/useXpStore"
import LeftDropdown from "../../features/pomodoro/LeftDropdown"
import RightDropdown from "../../features/pomodoro/RightDropdown"
import PomodoroTimerDisplay from "../../features/pomodoro/PomodoroTimerDisplay"
import PomodoroTimerControls from "../../features/pomodoro/PomodoroTimerControls"
import PomodoroTasksList from "../../features/pomodoro/PomodoroTaskList"
import { useGetUserTodoLists } from "../../features/todos/todoListHooks/useGetUserTodoLists"
import { useCompleteTodo } from "../../features/todos/todoHooks/useCompleteTodo"
import { colorMap, getCompletedColor, getPriorityColor, iconMap } from "../../utils/todoUtils"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { FaCheckCircle } from "react-icons/fa"
import { truncateText } from "../../utils/truncateText"
import { FaCalendar, FaPlus } from "react-icons/fa6"
import { IoClose } from "react-icons/io5"

const ACTIVE_KEY = "pomodoro_is_active"
const START_TIMESTAMP_KEY = "pomodoro_start_timestamp"
const DURATION_AT_START_KEY = "pomodoro_duration_at_start"
const PAUSED_TIME_KEY = "pomodoro_paused_time"
const BREAK_KEY = "pomodoro_is_break"
const SESSION_COUNT_KEY = "pomodoro_session_count"
const GOAL_REACHED_KEY = "pomodoro_goal_reached"
const SELECTED_TASK_KEY = "pomodoro_selected_task"

const PomodoroPage = () => {
  const navigate = useNavigate()
  const { authUser } = useAuthUser()
  const { settings, isSettingsLoading } = useGetPomodoroSettings()
  const { endStudySession } = useEndStudySession()
  const isMobile = useIsMobile()
  const { xpGainedAmount, setXpGainedAmount, showXpGain, setShowXpGain } = useXpStore()

  const [selectedTaskId, setSelectedTaskId] = useState(() => {
    return localStorage.getItem(SELECTED_TASK_KEY) || ""
  })
  const [visuallyCompleted, setVisuallyCompleted] = useState({})

  const { myTodoLists, myListsLoading } = useGetUserTodoLists()

  const allTodos = useMemo(() => {
    return (
      myTodoLists?.pages?.flatMap((page) => page.data.flatMap((todoList) => todoList.todos)) || []
    )
  }, [myTodoLists])

  const selectedTask = allTodos?.find((task) => task._id === selectedTaskId)

  const { completeTodo, isCompletingTodo } = useCompleteTodo()

  const [showTodoDropdown, setShowTodoDropdown] = useState(false)

  const [timer, setTimer] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [sessionCount, setSessionCount] = useState(0)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isGoalReached, setIsGoalReached] = useState(false)

  const [showShareModal, setShowShareModal] = useState(false)
  const [milestoneLevel, setMilestoneLevel] = useState(null)

  const [showInfoModal, setShowInfoModal] = useState(false)
  const [isRightDropdownOpen, setIsRightDropdownOpen] = useState(true)
  const [isLeftDropdownOpen, setIsLeftDropdownOpen] = useState(true)

  const [showResetTimerModal, setShowResetTimerModal] = useState(false)
  const [showResetCurrentSessionModal, setShowResetCurrentSessionModal] = useState(false)

  const rafRef = useRef(null)
  const startTimestampRef = useRef(0)
  const durationAtStartRef = useRef(0)
  const handleSessionEndRef = useRef(() => {})
  const alarmAudioRef = useRef(null)
  const isEndingSessionRef = useRef(false)
  const breakEndAudioRef = useRef(null)

  useEffect(() => {
    if (!alarmAudioRef.current) {
      const audio = new Audio("/alarm.mp3")
      audio.volume = 0.3 // Sets volume to 30%
      alarmAudioRef.current = audio
    }
    // If you added the breakEndAudioRef from before:
    if (!breakEndAudioRef.current) {
      const breakAudio = new Audio("/breakalarm.mp3")
      breakAudio.volume = 0.1
      breakEndAudioRef.current = breakAudio
    }

    return () => {
      if (alarmAudioRef.current) alarmAudioRef.current.pause()
      if (breakEndAudioRef.current) breakEndAudioRef.current.pause()
    }
  }, [])

  const playAlarm = useCallback(() => {
    if (settings && !settings.isMuted && alarmAudioRef.current) {
      alarmAudioRef.current.currentTime = 0
      alarmAudioRef.current.play().catch((e) => console.error("Audio playback failed:", e))
    }
  }, [settings])

  const handleReset = useCallback(() => {
    if (!settings) return
    isEndingSessionRef.current = false
    setIsActive(false)
    setTimer(settings.sessionDuration * 60)
    setIsBreak(false)
    setSessionCount(0)
    setIsGoalReached(false)
    setShowResetTimerModal(false)
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("pomodoro_")) localStorage.removeItem(key)
    })
  }, [settings])

  const handleResetCurrent = () => {
    if (!settings) return

    setIsActive(false)

    let resetDuration
    if (isBreak) {
      const isLongBreak =
        sessionCount > 0 &&
        settings.sessionsBeforeLongBreak > 0 &&
        sessionCount % settings.sessionsBeforeLongBreak === 0
      resetDuration = isLongBreak
        ? settings.longBreakDuration * 60
        : settings.shortBreakDuration * 60
    } else {
      resetDuration = settings.sessionDuration * 60
    }

    setTimer(resetDuration)

    localStorage.setItem(PAUSED_TIME_KEY, resetDuration)
    localStorage.setItem(ACTIVE_KEY, "false")
    localStorage.removeItem(START_TIMESTAMP_KEY)
    localStorage.removeItem(DURATION_AT_START_KEY)

    showAppToast("Current timer reset!")
    setShowResetCurrentSessionModal(false)
  }

  const startNextTimer = useCallback(
    (autoplay, nextSessionCount, nextIsBreak) => {
      if (!settings) return

      let nextTimerDuration
      if (nextIsBreak) {
        const isLongBreak =
          nextSessionCount > 0 &&
          settings.sessionsBeforeLongBreak > 0 &&
          nextSessionCount % settings.sessionsBeforeLongBreak === 0
        nextTimerDuration =
          (isLongBreak ? settings.longBreakDuration : settings.shortBreakDuration) * 60
      } else {
        nextTimerDuration = settings.sessionDuration * 60
      }

      setTimer(nextTimerDuration || 0)
      setIsBreak(nextIsBreak)
      setSessionCount(nextSessionCount)
      setIsGoalReached(false)

      localStorage.setItem(BREAK_KEY, nextIsBreak)
      localStorage.setItem(SESSION_COUNT_KEY, nextSessionCount)
      localStorage.setItem(GOAL_REACHED_KEY, "false")

      if (autoplay) {
        const startTime = Date.now()
        startTimestampRef.current = startTime
        durationAtStartRef.current = nextTimerDuration

        localStorage.setItem(ACTIVE_KEY, "true")
        localStorage.setItem(START_TIMESTAMP_KEY, startTime)
        localStorage.setItem(DURATION_AT_START_KEY, nextTimerDuration)
        localStorage.removeItem(PAUSED_TIME_KEY)

        setIsActive(true)
      } else {
        setIsActive(false)
        localStorage.setItem(PAUSED_TIME_KEY, nextTimerDuration)
        localStorage.setItem(ACTIVE_KEY, "false")
        localStorage.removeItem(START_TIMESTAMP_KEY)
        localStorage.removeItem(DURATION_AT_START_KEY)
      }
    },
    [settings],
  )

  const handleSessionEnd = useCallback(() => {
    if (isEndingSessionRef.current || !settings) return

    isEndingSessionRef.current = true

    setIsActive(false)

    const setupNextPhase = () => {
      if (!isBreak) {
        playAlarm()
        const newSessionCount = sessionCount + 1
        const isGoalMet =
          settings.sessionGoalCount > 0 && newSessionCount >= settings.sessionGoalCount

        // --- Calculate dynamic XP gained amount ---
        let xpMultiplier
        if (settings.sessionDuration >= 120) {
          xpMultiplier = 20
        } else if (settings.sessionDuration >= 60) {
          xpMultiplier = 15
        } else {
          xpMultiplier = 10
        }

        const calculatedXpGained = settings.sessionDuration * xpMultiplier
        // --- End of dynamic XP calculation ---

        endStudySession(
          { duration: settings.sessionDuration, taskId: selectedTaskId },
          {
            onSuccess: (data) => {
              // This is the data returned from the backend's endStudySession controller
              setXpGainedAmount(calculatedXpGained)
              setShowXpGain(true)
              setTimeout(() => setShowXpGain(false), 2000)

              if (data?.xpResult?.levelsGained?.length > 0) {
                const milestoneLevelReached = Math.max(
                  ...data.xpResult.levelsGained.filter((level) => level % 10 === 0),
                )

                if (milestoneLevelReached > 0) {
                  setMilestoneLevel(milestoneLevelReached)
                  setShowShareModal(true)
                } else {
                  showAppToast(`You leveled up to Level ${data.xpResult.finalLevel}! 🎉`, "success")
                }
              }

              if (isGoalMet) {
                showAppToast(`Goal of ${settings.sessionGoalCount} sessions reached! 🎉`, "success")
                setTimer(0)
                setSessionCount(newSessionCount)
                setIsGoalReached(true)
                localStorage.setItem(GOAL_REACHED_KEY, "true")
                localStorage.setItem(SESSION_COUNT_KEY, String(newSessionCount))
                localStorage.setItem(ACTIVE_KEY, "false")
                isEndingSessionRef.current = false
                return
              }
              const shouldStartBreak = !settings.skipBreaks
              startNextTimer(settings.autoplay, newSessionCount, shouldStartBreak)
              isEndingSessionRef.current = false
            },
            onError: (error) => {
              showAppToast(error.message || "Failed to log session.", "error")
              isEndingSessionRef.current = false
            },
          },
        )
      } else {
        if (settings && !settings.isMuted && breakEndAudioRef.current) {
          breakEndAudioRef.current.play()
        }

        isEndingSessionRef.current = false
        startNextTimer(settings.autoplay, sessionCount, false)
      }
    }
    setTimeout(setupNextPhase, 1)
  }, [
    settings,
    isBreak,
    sessionCount,
    playAlarm,
    endStudySession,
    startNextTimer,
    setShowXpGain,
    setXpGainedAmount,
    selectedTaskId,
  ])

  const startAnimation = useCallback(() => {
    const tick = () => {
      const elapsedSec = (Date.now() - startTimestampRef.current) / 10
      const remaining = durationAtStartRef.current - elapsedSec
      if (remaining <= 0) {
        setTimer(0)
        handleSessionEndRef.current()
        return
      }
      setTimer(remaining)
      rafRef.current = requestAnimationFrame(tick)
    }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    if (isActive && !isGoalReached) {
      startAnimation()
    } else {
      cancelAnimationFrame(rafRef.current)
    }
    return () => cancelAnimationFrame(rafRef.current)
  }, [isActive, isGoalReached, startAnimation])

  useEffect(() => {
    handleSessionEndRef.current = handleSessionEnd
  }, [handleSessionEnd])

  useEffect(() => {
    if (isSettingsLoading || !settings) return
    const savedIsActive = localStorage.getItem(ACTIVE_KEY) === "true"
    const savedStartTime = parseInt(localStorage.getItem(START_TIMESTAMP_KEY), 10)
    const savedDurationAtStart = parseInt(localStorage.getItem(DURATION_AT_START_KEY), 10)
    const savedPausedTime = parseFloat(localStorage.getItem(PAUSED_TIME_KEY))
    const savedIsBreak = localStorage.getItem(BREAK_KEY) === "true"
    const savedSessionCount = parseInt(localStorage.getItem(SESSION_COUNT_KEY), 10) || 0
    const savedGoalReached = localStorage.getItem(GOAL_REACHED_KEY) === "true"
    const savedSelectedTask = localStorage.getItem(SELECTED_TASK_KEY) // NEW

    if (savedSelectedTask) {
      setSelectedTaskId(savedSelectedTask)
    }

    setIsBreak(savedIsBreak)
    setSessionCount(savedSessionCount)
    setIsGoalReached(savedGoalReached)

    if (savedGoalReached) {
      setTimer(0)
      setIsActive(false)
      return
    }
    if (savedIsActive && savedStartTime && savedDurationAtStart) {
      const elapsedTime = (Date.now() - savedStartTime) / 10
      const newTimer = savedDurationAtStart - elapsedTime
      setTimer(newTimer > 0 ? newTimer : 0)
      setIsActive(newTimer > 0)
      startTimestampRef.current = savedStartTime
      durationAtStartRef.current = savedDurationAtStart
    } else if (!isNaN(savedPausedTime)) {
      setTimer(savedPausedTime)
      setIsActive(false)
    } else {
      setTimer(settings.sessionDuration * 60)
      setIsActive(false)
    }
  }, [isSettingsLoading, settings])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) return
      if (localStorage.getItem(GOAL_REACHED_KEY) === "true") {
        setIsActive(false)
        setTimer(0)
        setIsGoalReached(true)
        return
      }
      if (localStorage.getItem(ACTIVE_KEY) === "true") {
        const startTime = parseInt(localStorage.getItem(START_TIMESTAMP_KEY), 10)
        const durationAtStart = parseInt(localStorage.getItem(DURATION_AT_START_KEY), 10)
        if (startTime && durationAtStart) {
          const elapsedTime = (Date.now() - startTime) / 10
          const newTimer = durationAtStart - elapsedTime
          if (newTimer <= 0) {
            setTimer(0)
            setIsActive(false)
            handleSessionEndRef.current()
          } else {
            setTimer(newTimer)
            setIsActive(true)
            startTimestampRef.current = startTime
            durationAtStartRef.current = durationAtStart
          }
        }
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [])

  useEffect(() => {
    if (selectedTaskId) {
      localStorage.setItem(SELECTED_TASK_KEY, selectedTaskId)
    } else {
      localStorage.removeItem(SELECTED_TASK_KEY)
    }
  }, [selectedTaskId])

  const handleStart = async () => {
    // if (!selectedTaskId) {
    //   showAppToast("Please select a task to begin your study session.", "error")
    //   return
    // }

    if (isActive || !settings || timer <= 0 || isGoalReached) return
    const now = Date.now()
    startTimestampRef.current = now
    durationAtStartRef.current = timer
    localStorage.setItem(ACTIVE_KEY, "true")
    localStorage.setItem(START_TIMESTAMP_KEY, now)
    localStorage.setItem(DURATION_AT_START_KEY, timer)
    localStorage.setItem(BREAK_KEY, isBreak)
    localStorage.setItem(SESSION_COUNT_KEY, sessionCount)
    localStorage.removeItem(PAUSED_TIME_KEY)
    localStorage.setItem(GOAL_REACHED_KEY, "false")
    localStorage.setItem(SELECTED_TASK_KEY, selectedTaskId) // NEW
    setIsActive(true)
  }

  const handlePause = () => {
    if (!isActive) return
    setIsActive(false)
    localStorage.setItem(PAUSED_TIME_KEY, timer)
    localStorage.setItem(ACTIVE_KEY, "false")
  }

  const handleOpenSettingsPage = () => {
    if (isMobile) {
      navigate("/pomodoro-settings")
    } else {
      setIsSettingsOpen(true)
    }
  }

  const handleResetTimerClick = () => {
    setShowResetTimerModal(true)
  }

  const toggleRightDropdown = (e) => {
    e.stopPropagation()
    setIsRightDropdownOpen(!isRightDropdownOpen)
  }
  const toggleLeftDropdown = (e) => {
    e.stopPropagation()
    setIsLeftDropdownOpen(!isLeftDropdownOpen)
  }

  const handleComplete = (todoId, e) => {
    e.stopPropagation()

    if (selectedTask.user !== authUser._id || isVisuallyCompleted) {
      return
    }

    showAppToast("Todo completed! ✨", "success")
    setVisuallyCompleted((prev) => ({ ...prev, [todoId]: true }))

    completeTodo(todoId)

    const completedTaskIndex = allTodos.findIndex((todo) => todo._id === todoId)

    if (completedTaskIndex !== -1) {
      const nextTaskIndex = completedTaskIndex + 1
      if (nextTaskIndex < allTodos.length) {
        const nextTaskId = allTodos[nextTaskIndex]._id
        setSelectedTaskId(nextTaskId)
      } else {
        setSelectedTaskId(null)
      }
    }
  }

  const isVisuallyCompleted = visuallyCompleted[selectedTask?._id] || selectedTask?.completed
  const formattedDueDate = selectedTask?.dueDate
    ? new Date(selectedTask?.dueDate).toLocaleDateString()
    : null

  const IconComponent = iconMap[selectedTask?.icon]

  if (isSettingsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <>
      <main className="template container mx-auto flex h-dvh w-full max-w-2xl animate-fade-in flex-col items-center justify-between overflow-y-auto border-accent bg-base-100 font-sans md:border-x">
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

        <div className="relative flex w-[70%] flex-grow flex-col items-center justify-center gap-8 rounded-3xl p-3 md:p-10">
          <div className="absolute top-[88px] flex w-full cursor-pointer justify-center">
            {selectedTask ? (
              <div
                onClick={() => setShowTodoDropdown(true)}
                className="gray-shadow absolute -top-20 flex w-full items-center justify-between rounded-lg border-l-4 border-primary bg-base-100 p-4 py-2"
              >
                <div className="flex flex-grow items-center gap-2">
                  <button
                    onClick={(e) => {
                      handleComplete(selectedTask._id, e)
                    }}
                    className={`flex-shrink-0 rounded-full ${isVisuallyCompleted ? getCompletedColor(selectedTask.priority) : getPriorityColor(selectedTask.priority)} ${getPriorityColor(selectedTask.priority) === "rounded-full border-slate-400" ? "border" : "border-2"} size-5`}
                    disabled={isCompletingTodo}
                  >
                    {isVisuallyCompleted && <FaCheckCircle className="size-4" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-xs font-bold">
                      {IconComponent && (
                        <IconComponent className={`${colorMap[selectedTask?.color]}`} />
                      )}
                      {truncateText(selectedTask.listName, 20)}
                    </p>
                    <h2 className="text-sm font-semibold">
                      {truncateText(selectedTask.title, 20)}
                    </h2>
                    {selectedTask.description && (
                      <p className="text-xs text-slate-500">
                        {truncateText(selectedTask.description, 30)}
                      </p>
                    )}
                    {selectedTask.dueDate && (
                      <p className="text-xs text-slate-500">
                        {" "}
                        <p className="flex items-center gap-1 text-xs text-slate-500">
                          <FaCalendar /> {formattedDueDate}
                        </p>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowTodoDropdown(true)}
                className="absolute -top-16 font-semibold text-primary hover:underline"
              >
                <span className="flex items-center gap-1 text-center">
                  <FaPlus size={14} />
                  Choose Task
                </span>
              </button>
            )}
          </div>
          {!isMobile && (
            <h1
              key={isBreak ? "break" : "study"}
              className={`text-3xl font-bold tracking-wider ${isBreak ? "text-teal-300" : "text-primary"}`}
            >
              {!isGoalReached ? (isBreak ? "Break Time" : "Study Time") : "Finished"}
            </h1>
          )}

          <PomodoroTimerDisplay
            isBreak={isBreak}
            timer={timer}
            setIsActive={setIsActive}
            startNextTimer={startNextTimer}
            sessionCount={sessionCount}
            setShowResetCurrentSessionModal={setShowResetCurrentSessionModal}
            isGoalReached={isGoalReached}
            onSessionEnd={handleSessionEnd}
          />

          <PomodoroTimerControls
            onOpenSettingsPage={handleOpenSettingsPage}
            isGoalReached={isGoalReached}
            isActive={isActive}
            onPause={handlePause}
            onStart={handleStart}
            timer={timer}
            onResetTimerClick={handleResetTimerClick}
          />
        </div>
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
          message="Are you sure you want to reset the current session's timer?"
          confirmButtonText={"Reset"}
          modalTitle={"Reset current session"}
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
