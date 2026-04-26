import { useEffect, useRef, useCallback } from "react"
import { usePomodoroTimerStore, STORAGE_KEYS } from "../../../store/usePomodoroTimerStore"
import { useGetPomodoroSettings } from "../pomodoroHooks/usePomodoroQueries"
import { useEndStudySession } from "../pomodoroHooks/usePomodoroMutations"
import { showAppToast } from "../../../utils/showAppToast"
import useXpStore from "../../../store/useXpStore"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { WARDROBE_CONFIG } from "../../wardrobe/wardrobeConfig"

export const PomodoroTimerEngine = () => {
  const isActive = usePomodoroTimerStore((s) => s.isActive)
  const isBreak = usePomodoroTimerStore((s) => s.isBreak)
  const sessionCount = usePomodoroTimerStore((s) => s.sessionCount)
  const isGoalReached = usePomodoroTimerStore((s) => s.isGoalReached)
  const selectedTaskId = usePomodoroTimerStore((s) => s.selectedTaskId)
  const isInitialized = usePomodoroTimerStore((s) => s.isInitialized)
  const timer = usePomodoroTimerStore((s) => s.timer)

  const setTimer = usePomodoroTimerStore((s) => s.setTimer)
  const setIsActive = usePomodoroTimerStore((s) => s.setIsActive)
  const setIsBreak = usePomodoroTimerStore((s) => s.setIsBreak)
  const setSessionCount = usePomodoroTimerStore((s) => s.setSessionCount)
  const setIsGoalReached = usePomodoroTimerStore((s) => s.setIsGoalReached)
  const setIsInitialized = usePomodoroTimerStore((s) => s.setIsInitialized)
  const persistNextPhase = usePomodoroTimerStore((s) => s.persistNextPhase)
  const setEngineActions = usePomodoroTimerStore((s) => s.setEngineActions)

  const { settings, isSettingsLoading } = useGetPomodoroSettings()
  const { authUser } = useAuthUser()
  const { endStudySession } = useEndStudySession()
  const { setXpGainedAmount, setShowXpGain } = useXpStore()

  const workerRef = useRef(null)
  const fallbackIntervalRef = useRef(null)
  const startTimestampRef = useRef(0)
  const durationAtStartRef = useRef(0)
  const isEndingSessionRef = useRef(false)
  const alarmAudioRef = useRef(null)
  const breakEndAudioRef = useRef(null)

  // ── Snapshot of session duration locked in at START time ─────────────────
  // This is the fix for the settings-change bug. We capture sessionDuration
  // when the user presses Start, and use this value — not settingsRef —
  // when calling endStudySession. Changing settings mid-session has no effect
  // on what gets logged to the backend.
  const committedSessionDurationRef = useRef(null)

  // ── Refs kept in sync with latest store/props values ─────────────────────
  const isBreakRef = useRef(isBreak)
  const isActiveRef = useRef(isActive)
  const isGoalReachedRef = useRef(isGoalReached)
  const sessionCountRef = useRef(sessionCount)
  const settingsRef = useRef(settings)
  const selectedTaskIdRef = useRef(selectedTaskId)
  const sessionEndTimeoutRef = useRef(null)

  useEffect(() => {
    isActiveRef.current = isActive
  }, [isActive])
  useEffect(() => {
    isGoalReachedRef.current = isGoalReached
  }, [isGoalReached])
  useEffect(() => {
    isBreakRef.current = isBreak
  }, [isBreak])
  useEffect(() => {
    sessionCountRef.current = sessionCount
  }, [sessionCount])
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])
  useEffect(() => {
    selectedTaskIdRef.current = selectedTaskId
  }, [selectedTaskId])

  useEffect(() => {
    const handleResume = () => {
      if (!isActiveRef.current || isGoalReachedRef.current) return
      processTickRef.current()
      if (workerRef.current) {
        workerRef.current.postMessage({ type: "STOP" })
        workerRef.current.postMessage({ type: "START" })
      } else {
        if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current)
        fallbackIntervalRef.current = setInterval(() => processTickRef.current(), 500)
      }
    }

    // Store named wrappers so removeEventListener can match them
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") handleResume()
    }

    document.addEventListener("visibilitychange", onVisibilityChange)
    window.addEventListener("focus", handleResume)
    window.addEventListener("pageshow", handleResume)

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.removeEventListener("focus", handleResume)
      window.removeEventListener("pageshow", handleResume)
    }
  }, [])

  // ── Audio setup ───────────────────────────────────────────────────────────
  useEffect(() => {
    alarmAudioRef.current = new Audio("/alarm.mp3")
    alarmAudioRef.current.volume = 0.3
    breakEndAudioRef.current = new Audio("/breakalarm.mp3")
    breakEndAudioRef.current.volume = 0.1
    return () => {
      alarmAudioRef.current?.pause()
      breakEndAudioRef.current?.pause()
    }
  }, [])

  useEffect(() => {
    if (!isInitialized) return

    let revertTimeout

    const isInitialState =
      !isActive &&
      startTimestampRef.current === 0 &&
      timer === settingsRef.current?.sessionDuration * 60

    if (isGoalReached) {
      document.title = "Goal Reached!"
    } else if (isActive) {
      const mins = Math.floor(timer / 60)
      const secs = Math.floor(timer % 60)
      const timeString = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      const status = isBreak ? "Break" : "Focus"
      document.title = `${timeString} ${status} | Klayne`
    } else if (!isActive && timer > 0 && !isInitialState) {
      // 2. Logic for PAUSED state (User has interacted, but it's not active)
      const mins = Math.floor(timer / 60)
      const secs = Math.floor(timer % 60)
      const timeString = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      document.title = `Paused - ${timeString}`

      // Revert to "Klayne" after 5 minutes of inactivity
      revertTimeout = setTimeout(
        () => {
          document.title = "Klayne"
        },
        5 * 60 * 1000,
      )
    } else {
      // 3. Fallback for Initial State or when timer is 0
      document.title = "Klayne"
    }

    return () => {
      if (revertTimeout) clearTimeout(revertTimeout)
    }
  }, [timer, isActive, isBreak, isGoalReached, isInitialized])

const playAlarm = useCallback(() => {
  const s = settingsRef.current
  if (s && !s.isMuted && alarmAudioRef.current) {
    alarmAudioRef.current.currentTime = 0
    alarmAudioRef.current.play().catch(() => {})
  }

  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg
            .showNotification("Pomodoro", { body: "Session complete! Time for a break." })
            .catch((e) => console.warn(e))
        })
      } else {
        new Notification("Pomodoro", { body: "Session complete! Time for a break." })
      }
    }
  } catch (error) {
    console.warn("PWA Notification blocked:", error)
  }
}, [])

  // ── startNextTimer ────────────────────────────────────────────────────────
  const startNextTimer = useCallback(
    (autoplay, nextSessionCount, nextIsBreak) => {
      const s = settingsRef.current
      if (!s) return

      let duration
      if (nextIsBreak) {
        const isLong =
          nextSessionCount > 0 &&
          s.sessionsBeforeLongBreak > 0 &&
          nextSessionCount % s.sessionsBeforeLongBreak === 0
        duration = (isLong ? s.longBreakDuration : s.shortBreakDuration) * 60
      } else {
        duration = s.sessionDuration * 60
      }

      setTimer(duration)
      setIsBreak(nextIsBreak)
      setSessionCount(nextSessionCount)
      setIsGoalReached(false)

      if (autoplay) {
        const now = Date.now()
        startTimestampRef.current = now
        durationAtStartRef.current = duration

        // Lock in the new session's duration as the committed value
        if (!nextIsBreak) {
          committedSessionDurationRef.current = Math.round(s.sessionDuration) // ← add Math.round
        }

        setIsActive(true)
        persistNextPhase(nextIsBreak, nextSessionCount, duration, true, now)
      } else {
        setIsActive(false)
        persistNextPhase(nextIsBreak, nextSessionCount, duration, false, null)
      }
    },
    [setTimer, setIsBreak, setSessionCount, setIsGoalReached, setIsActive, persistNextPhase],
  )

  // ── handleSessionEnd ──────────────────────────────────────────────────────
const handleSessionEnd = useCallback(() => {
  if (isEndingSessionRef.current) return
  const s = settingsRef.current
  if (!s) return

  isEndingSessionRef.current = true
  setIsActive(false)

  if (sessionEndTimeoutRef.current) clearTimeout(sessionEndTimeoutRef.current)

  const currentIsBreak = isBreakRef.current
  const currentSessionCount = sessionCountRef.current
  const currentSelectedTaskId = selectedTaskIdRef.current
  const loggedDuration = Math.round(committedSessionDurationRef.current ?? s.sessionDuration)

  // Safety valve — if API never responds, still advance so user isn't stuck
  sessionEndTimeoutRef.current = setTimeout(() => {
    if (!isEndingSessionRef.current) return
    isEndingSessionRef.current = false
    showAppToast("Session may not have saved. Check your connection.", "warning")
    const nextCount = currentIsBreak ? currentSessionCount : currentSessionCount + 1
    const nextIsBreak = !currentIsBreak && !s.skipBreaks
    startNextTimer(s.autoplay, nextCount, nextIsBreak)
  }, 15_000) // 15s covers 2 retries × ~5s each with some buffer

  setTimeout(() => {
    if (!currentIsBreak) {
      playAlarm()
      const newSessionCount = currentSessionCount + 1
      const isGoalMet = s.sessionGoalCount > 0 && newSessionCount >= s.sessionGoalCount
      const xpMultiplier = loggedDuration >= 120 ? 20 : loggedDuration >= 60 ? 15 : 10
      const calculatedXp = loggedDuration * xpMultiplier

      endStudySession(
        { duration: loggedDuration, taskId: currentSelectedTaskId },
        {
          onSuccess: (data) => {
            clearTimeout(sessionEndTimeoutRef.current)
            isEndingSessionRef.current = false

            setXpGainedAmount(calculatedXp)
            setShowXpGain(true)
            setTimeout(() => setShowXpGain(false), 2000)

            if (data.newUnlocks?.length > 0) {
              data.newUnlocks.forEach((itemKey) => {
                const config = WARDROBE_CONFIG[itemKey]
                if (config) showAppToast(`🎁 Unlocked: ${config.label}!`, "success")
              })
            }

            if (data?.xpResult?.levelsGained?.length > 0) {
              const milestoneLevelReached = Math.max(
                ...data.xpResult.levelsGained.filter((level) => level % 10 === 0),
              )
              if (milestoneLevelReached > 0) {
                usePomodoroTimerStore.getState().setMilestoneLevel(milestoneLevelReached)
                usePomodoroTimerStore.getState().setShowShareModal(true)
              } else {
                showAppToast(`You leveled up to Level ${data.xpResult.finalLevel}! 🎉`, "success")
              }
            }

            if (isGoalMet) {
              showAppToast(`Goal of ${s.sessionGoalCount} sessions reached! 🎉`, "success")
              setTimer(0)
              setSessionCount(newSessionCount)
              setIsGoalReached(true)
              localStorage.setItem(STORAGE_KEYS.GOAL_REACHED, "true")
              localStorage.setItem(STORAGE_KEYS.SESSION_COUNT, String(newSessionCount))
              localStorage.setItem(STORAGE_KEYS.ACTIVE, "false")
              isEndingSessionRef.current = false
              return
            }

            startNextTimer(s.autoplay, newSessionCount, !s.skipBreaks)
          },
          onError: (err) => {
            clearTimeout(sessionEndTimeoutRef.current)
            isEndingSessionRef.current = false
            showAppToast("Session may not have saved. Continuing...", "warning")
            // Still advance — user should not be stuck because of a network failure
            if (!isGoalMet) {
              startNextTimer(s.autoplay, newSessionCount, !s.skipBreaks)
            }
          },
        },
      )
    } else {
      if (!s.isMuted && breakEndAudioRef.current) {
        breakEndAudioRef.current.play().catch(() => {})
      }
      clearTimeout(sessionEndTimeoutRef.current)
      isEndingSessionRef.current = false
      startNextTimer(s.autoplay, currentSessionCount, false)
    }
  }, 1)
}, [
  setIsActive,
  setTimer,
  setSessionCount,
  setIsGoalReached,
  playAlarm,
  endStudySession,
  startNextTimer,
  setXpGainedAmount,
  setShowXpGain,
])

  // ── Keep handleSessionEnd ref current so processTick never goes stale ─────
  const handleSessionEndRef = useRef(handleSessionEnd)
  useEffect(() => {
    handleSessionEndRef.current = handleSessionEnd
  }, [handleSessionEnd])

  // ── processTick ───────────────────────────────────────────────────────────
  const processTick = useCallback(() => {
    const startTime = startTimestampRef.current
    const duration = durationAtStartRef.current
    if (!startTime || !duration) return

    const elapsed = (Date.now() - startTime) / 1000
    const remaining = duration - elapsed

    if (remaining <= 0) {
      setTimer(0)
      workerRef.current?.postMessage({ type: "STOP" })
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current)
        fallbackIntervalRef.current = null
      }
      handleSessionEndRef.current()
    } else {
      setTimer(remaining)
    }
  }, [setTimer])

  // ── Keep processTick ref current so the worker closure never goes stale ───
  const processTickRef = useRef(processTick)
  useEffect(() => {
    processTickRef.current = processTick
  }, [processTick])

  // ── Worker / fallback interval setup — created once, never recreated ──────
  useEffect(() => {
    const supportsWorker = typeof Worker !== "undefined"

    if (supportsWorker) {
      try {
        workerRef.current = new Worker("/timerWorker.js")
        workerRef.current.onerror = () => {
          workerRef.current = null
          fallbackIntervalRef.current = setInterval(() => processTickRef.current(), 500)
        }
        workerRef.current.onmessage = (e) => {
          if (e.data.type === "TICK") processTickRef.current()
        }
      } catch {
        fallbackIntervalRef.current = setInterval(() => processTickRef.current(), 500)
      }
    } else {
      fallbackIntervalRef.current = setInterval(() => processTickRef.current(), 500)
    }

    return () => {
      workerRef.current?.postMessage({ type: "STOP" })
      workerRef.current?.terminate()
      if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current)
    }
  }, []) // empty — never recreates

  // ── Start/stop the worker when isActive or isGoalReached changes ──────────
  useEffect(() => {
    if (isActive && !isGoalReached) {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: "START" })
      } else if (!fallbackIntervalRef.current) {
        fallbackIntervalRef.current = setInterval(() => processTickRef.current(), 500)
      }
    } else {
      workerRef.current?.postMessage({ type: "STOP" })
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current)
        fallbackIntervalRef.current = null
      }
    }
  }, [isActive, isGoalReached])

  // ── Hydrate from localStorage on first mount ──────────────────────────────
  useEffect(() => {
    if (isSettingsLoading || !settings || isInitialized) return

    const savedIsActive = localStorage.getItem(STORAGE_KEYS.ACTIVE) === "true"
    const savedStartTime = parseInt(localStorage.getItem(STORAGE_KEYS.START_TIMESTAMP), 10)
    const savedDurationAtStart = parseInt(localStorage.getItem(STORAGE_KEYS.DURATION_AT_START), 10)
    const savedPausedTime = parseFloat(localStorage.getItem(STORAGE_KEYS.PAUSED_TIME))
    const savedIsBreak = localStorage.getItem(STORAGE_KEYS.BREAK) === "true"
    const savedSessionCount = parseInt(localStorage.getItem(STORAGE_KEYS.SESSION_COUNT), 10) || 0
    const savedGoalReached = localStorage.getItem(STORAGE_KEYS.GOAL_REACHED) === "true"
    // Restore the committed duration so a page-reload mid-session still logs correctly
    const savedCommittedDuration = parseFloat(localStorage.getItem(STORAGE_KEYS.COMMITTED_DURATION))

    setIsBreak(savedIsBreak)
    setSessionCount(savedSessionCount)
    setIsGoalReached(savedGoalReached)
    setIsInitialized(true)

    if (!isNaN(savedCommittedDuration)) {
      committedSessionDurationRef.current = Math.round(savedCommittedDuration) // ← add Math.round
    }

    if (savedGoalReached) {
      setTimer(0)
      setIsActive(false)
      return
    }

    if (savedIsActive && savedStartTime && savedDurationAtStart) {
      const elapsed = (Date.now() - savedStartTime) / 1000
      const remaining = savedDurationAtStart - elapsed

      startTimestampRef.current = savedStartTime
      durationAtStartRef.current = savedDurationAtStart

      if (remaining > 0) {
        setTimer(remaining)
        setIsActive(true)
      } else {
        setTimer(0)
        setIsActive(false)
        // Session ended while the tab was closed — log it
        if (authUser) handleSessionEndRef.current()
      }
    } else if (!isNaN(savedPausedTime)) {
      setTimer(savedPausedTime)
      setIsActive(false)
    } else {
      setTimer(settings.sessionDuration * 60)
      setIsActive(false)
    }
  }, [isSettingsLoading, settings, isInitialized])

  // ── Register engine actions into the store ────────────────────────────────
useEffect(() => {
  setEngineActions({
    startNextTimer,
    handleSessionEnd,
    startTimestampRef,
    durationAtStartRef,
    committedSessionDurationRef,
    isEndingSessionRef,
    // Closes over the engine's actual refs — bypasses any store ref identity concerns
    forceEnd: () => {
      isEndingSessionRef.current = false
      if (sessionEndTimeoutRef.current) clearTimeout(sessionEndTimeoutRef.current)
      handleSessionEndRef.current()
    },
  })
  return () => setEngineActions(null)
}, [startNextTimer, handleSessionEnd, setEngineActions])

  return null
}
