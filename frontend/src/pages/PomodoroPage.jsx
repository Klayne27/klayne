import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { FaCog, FaPlay, FaPause, FaRedo } from "react-icons/fa"

import {
  useEndStudySession,
  useGetPomodoroSettings,
  useStartStudySession,
} from "../hooks/pomodoroHooks/usePomodo"
import PomodoroSettingsModal from "../components/common/PomodoroSettingsModal"
import { CiTrophy } from "react-icons/ci"
import { MdLibraryBooks } from "react-icons/md"
import { PiHouseThin } from "react-icons/pi"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import { showAppToast } from "../utils/showAppToast"
import { useSocket } from "../context/SocketContext"

const ACTIVE_KEY = "pomodoro_is_active"
const START_TIMESTAMP_KEY = "pomodoro_start_timestamp"
const DURATION_AT_START_KEY = "pomodoro_duration_at_start"
const PAUSED_TIME_KEY = "pomodoro_paused_time"
const BREAK_KEY = "pomodoro_is_break"
const SESSION_COUNT_KEY = "pomodoro_session_count"
const POST_ID_KEY = "pomodoro_post_id"
const GOAL_REACHED_KEY = "pomodoro_goal_reached" // New key for localStorage

const PomodoroPage = () => {
  const navigate = useNavigate()
  const { newPostCount } = useSocket()
  const { data: settings, isLoading: isSettingsLoading } = useGetPomodoroSettings()
  const startSessionMutation = useStartStudySession()
  const endSessionMutation = useEndStudySession()

  const [timer, setTimer] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [sessionCount, setSessionCount] = useState(0)
  const [postId, setPostId] = useState(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isGoalReached, setIsGoalReached] = useState(false) // NEW: State to track if the goal is met

  const rafRef = useRef(null)
  const startTimestampRef = useRef(0)
  const durationAtStartRef = useRef(0)

  const isBreakRef = useRef(isBreak)
  const postIdRef = useRef(postId)
  const sessionCountRef = useRef(sessionCount)
  const isActiveRef = useRef(isActive)
  const handleSessionEndRef = useRef(() => {})
  const isGoalReachedRef = useRef(isGoalReached) // NEW: Ref for goal status
  const alarmAudioRef = useRef(null)

  useEffect(() => {
    // Check if the ref has been initialized to avoid creating duplicates if the component somehow remounts
    if (!alarmAudioRef.current) {
      alarmAudioRef.current = new Audio("/alarm.mp3")
    }
    return () => {
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause()
        alarmAudioRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (settings && typeof settings.volumeLevel === "number" && !isNaN(settings.volumeLevel)) {
      alarmAudioRef.current.volume = settings.volumeLevel
    }
  }, [settings])

  useEffect(() => {
    isBreakRef.current = isBreak
    postIdRef.current = postId
    sessionCountRef.current = sessionCount
    isActiveRef.current = isActive
    isGoalReachedRef.current = isGoalReached
  }, [isBreak, postId, sessionCount, isActive, isGoalReached])

  const playAlarm = useCallback(() => {
    if (settings && !settings.isMuted && alarmAudioRef.current) {
      alarmAudioRef.current.currentTime = 0
      // It's good practice to try to play the audio and catch any potential errors
      alarmAudioRef.current.play().catch((e) => console.error("Audio playback failed:", e))
    }
  }, [settings])

  const handleReset = useCallback(() => {
    if (!settings) return
    setIsActive(false)
    setTimer(settings.sessionDuration * 60)
    setIsBreak(false)
    setSessionCount(0)
    setPostId(null)
    setIsGoalReached(false) // Reset goal status
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("pomodoro_")) localStorage.removeItem(key)
    })
  }, [settings])

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
      setIsGoalReached(false) // Ensure goal is not reached on a new timer

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
    if (!settings || isGoalReachedRef.current) return // Prevent multiple ends

    setIsActive(false)

    const shouldAutoplay = settings.autoplay

    if (!isBreakRef.current) {
      playAlarm()

      const duration = settings.sessionDuration
      endSessionMutation.mutate(
        { duration, postId: postIdRef.current },
        {
          onSuccess: () => {
            const newSessionCount = sessionCountRef.current + 1
            if (settings.sessionGoalCount > 0 && newSessionCount >= settings.sessionGoalCount) {
              showAppToast(`Goal of ${settings.sessionGoalCount} sessions reached! 🎉`, "success")
              setIsActive(false)
              setTimer(0) // Timer to 00:00
              setSessionCount(newSessionCount)
              setIsGoalReached(true) // Set goal as reached
              localStorage.setItem(GOAL_REACHED_KEY, "true")
              localStorage.setItem(SESSION_COUNT_KEY, newSessionCount)
              localStorage.setItem(ACTIVE_KEY, "false")
            } else {
              startNextTimer(shouldAutoplay, newSessionCount, true)
            }
          },
          onError: () => {
            showAppToast("Failed to save session. Please try again.", "error")
            handleReset()
          },
        },
      )
    } else {
      const nextSessionCount = sessionCountRef.current
      const nextIsBreak = false

      if (!shouldAutoplay) {
        setPostId(null)
        localStorage.removeItem(POST_ID_KEY)
        startNextTimer(false, nextSessionCount, nextIsBreak)
        return
      }

      startSessionMutation.mutate(undefined, {
        onSuccess: (data) => {
          if (data?.postId) {
            setPostId(data.postId)
            localStorage.setItem(POST_ID_KEY, data.postId)
          } else {
            setPostId(null)
            localStorage.removeItem(POST_ID_KEY)
          }
          startNextTimer(true, nextSessionCount, nextIsBreak)
        },
        onError: () => {
          showAppToast("Failed to start the next session automatically.", "error")
          handleReset()
        },
      })
    }
  }, [settings, playAlarm, endSessionMutation, startNextTimer, handleReset, startSessionMutation])

  useEffect(() => {
    handleSessionEndRef.current = handleSessionEnd
  }, [handleSessionEnd])

  const startAnimation = useCallback(() => {
    const tick = () => {
      if (!isActiveRef.current || isGoalReachedRef.current) return

      const elapsedSec = (Date.now() - startTimestampRef.current) / 1000
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
    if (isSettingsLoading || !settings) return

    const savedIsActive = localStorage.getItem(ACTIVE_KEY) === "true"
    const savedStartTime = parseInt(localStorage.getItem(START_TIMESTAMP_KEY), 10)
    const savedDurationAtStart = parseInt(localStorage.getItem(DURATION_AT_START_KEY), 10)
    const savedPausedTime = parseFloat(localStorage.getItem(PAUSED_TIME_KEY))
    const savedIsBreak = localStorage.getItem(BREAK_KEY) === "true"
    const savedSessionCount = parseInt(localStorage.getItem(SESSION_COUNT_KEY), 10) || 0
    const savedPostId = localStorage.getItem(POST_ID_KEY) || null
    const savedGoalReached = localStorage.getItem(GOAL_REACHED_KEY) === "true" // Load goal status

    setIsBreak(savedIsBreak)
    setSessionCount(savedSessionCount)
    setPostId(savedPostId)
    setIsGoalReached(savedGoalReached) // Set goal status on load

    if (savedGoalReached) {
      setTimer(0) // Goal reached, timer should be 0
      setIsActive(false)
      return
    }

    if (savedIsActive && savedStartTime && savedDurationAtStart) {
      const elapsedTime = (Date.now() - savedStartTime) / 1000
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
          const elapsedTime = (Date.now() - startTime) / 1000
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

  const handleStart = async () => {
    if (isActive || !settings || timer <= 0 || isGoalReached) return // Disable start if goal is reached

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

    setIsActive(true)

    if (!isBreak && !postId) {
      try {
        const data = await startSessionMutation.mutateAsync()
        if (data?.postId) {
          setPostId(data.postId)
          localStorage.setItem(POST_ID_KEY, data.postId)
        }
      } catch {
        setIsActive(false)
      }
    }
  }

  const handlePause = () => {
    if (!isActive) return
    setIsActive(false)
    localStorage.setItem(PAUSED_TIME_KEY, timer)
    localStorage.setItem(ACTIVE_KEY, "false")
  }

  const minutes = Math.floor(timer / 60)
  const seconds = Math.floor(timer % 60)

  let totalDuration = 25 * 60
  if (settings) {
    const isCurrentBreakLong =
      isBreak &&
      sessionCount > 0 &&
      settings.sessionsBeforeLongBreak > 0 &&
      sessionCount % settings.sessionsBeforeLongBreak === 0

    totalDuration = isBreak
      ? (isCurrentBreakLong ? settings.longBreakDuration : settings.shortBreakDuration) * 60
      : settings.sessionDuration * 60
  }
  const progress = totalDuration ? Math.max(timer / totalDuration, 0) : 0

  const radius = 45
  const circumference = 2 * Math.PI * radius

  if (isSettingsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <main className="flex min-h-screen w-full animate-fade-in flex-col items-center justify-center bg-base-100 p-4 font-sans text-white">
      <div className="flex w-full max-w-md flex-col items-center gap-8 rounded-3xl p-6 shadow-2xl sm:p-10">
        {/* Header: Dynamic title */}
        <h1
          key={isBreak ? "break" : "study"} // Key ensures remount and animation on change
          className={`text-3xl font-bold tracking-wider ${isBreak ? "text-teal-300" : "text-primary"}`}
        >
          {isBreak ? "Break Time" : "Study Time"}
        </h1>
        {/* Radial Timer using SVG for better styling control */}
        <div className={`${minutes === 0 && seconds < 10 && "animate-pulse"} relative h-64 w-64 sm:h-72 sm:w-72`}>
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
            {/* Background track */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="8"
              className="stroke-slate-700"
            />
            {/* Progress arc */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              className={`transition-colors duration-500 ease-linear ${isBreak ? "stroke-teal-400" : "stroke-primary"}`}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: circumference * (1 - progress),
              }}
            />
          </svg>
          {/* Time display centered over the SVG */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-6xl tracking-tighter sm:text-7xl">
              {isGoalReached
                ? "00:00"
                : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`}
            </span>
          </div>
        </div>
        {/* Visual Session Counter */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm uppercase tracking-widest text-slate-400">
            Session {isGoalReached ? settings.sessionGoalCount : sessionCount} /{" "}
            {settings?.sessionGoalCount || "∞"}
          </p>
          {settings?.sessionGoalCount > 0 && (
            <div className="flex gap-2">
              {Array.from({ length: settings.sessionGoalCount }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full transition-colors ${i < sessionCount ? (isBreak ? "bg-teal-400" : "bg-primary") : "bg-slate-600"}`}
                />
              ))}
            </div>
          )}
        </div>
        {/* Main Controls: Clearer hierarchy */}
        <div className="flex w-full items-center justify-center gap-6">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700/50 text-slate-400 transition-all hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Open settings"
            disabled={isActive || isGoalReached}
          >
            <FaCog size={20} />
          </button>
          <button
            onClick={isActive ? handlePause : handleStart}
            className={`flex h-[72px] w-[72px] items-center justify-center rounded-full text-white shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 ${isActive ? "bg-teal-500 shadow-teal-500/50" : "bg-primary shadow-primary/50"}`}
            aria-label={isActive ? "Pause timer" : "Start timer"}
            disabled={timer <= 0 || isGoalReached}
          >
            {isActive ? <FaPause size={28} /> : <FaPlay size={28} className="ml-1" />}
          </button>
          <button
            onClick={handleReset}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700/50 text-slate-400 transition-all hover:bg-slate-700 hover:text-white"
            aria-label="Reset timer"
          >
            <FaRedo size={18} />
          </button>
        </div>
        {/* Footer Links */}
        <footer className="w-full">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate("/study-activity")}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700/50 text-slate-400 transition-all hover:bg-slate-700 hover:text-white"
            >
              <MdLibraryBooks size={25} />
            </button>

            <button
              onClick={() => navigate("/")}
              className="relative flex h-12 w-12 items-center justify-center rounded-full bg-slate-700/50 text-slate-400 transition-all hover:bg-slate-700 hover:text-white"
            >
              <PiHouseThin size={25} strokeWidth={15} />
              {newPostCount > 0 && (
                <div
                  className="absolute right-3.5 top-3.5 h-2 w-2 rounded-full bg-primary"
                  style={{ transform: "translate(50%, -50%)" }}
                ></div>
              )}
            </button>

            <button
              onClick={() => navigate("/study-leaderboard")}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700/50 text-slate-400 transition-all hover:bg-slate-700 hover:text-white"
            >
              <CiTrophy size={25} strokeWidth={1} />
            </button>
          </div>
        </footer>
      </div>
      {/* Modal remains unchanged, it will just appear over the new UI */}
      {settings && (
        <PomodoroSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          initialSettings={settings}
        />
      )}
    </main>
  )
}

export default PomodoroPage
