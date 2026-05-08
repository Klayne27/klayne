import { useCallback, useEffect, useRef } from "react"
import { usePomodoroTimerStore, STORAGE_KEYS } from "../../../store/usePomodoroTimerStore"
import { useGetActiveSession, useGetPomodoroSettings } from "../pomodoroHooks/usePomodoroQueries"
import { useEndStudySession } from "../pomodoroHooks/usePomodoroMutations"
import { cancelSessionApi, getActiveSessionApi, sessionHeartbeatApi, startSessionApi } from "../../../api/pomodoroApi"
import { showAppToast } from "../../../utils/showAppToast"
import useXpStore from "../../../store/useXpStore"
import { WARDROBE_CONFIG } from "../../wardrobe/wardrobeConfig"
import { useSocket } from "../../../context/SocketContext"

const getRemainingSeconds = (session) => {
  if (!session) return 0

  if (session.isPaused) {
    return Math.max(0, Number(session.pausedRemainingSeconds ?? session.remainingSeconds) || 0)
  }

  if (session.scheduledEndTime) {
    const scheduledEndMs = new Date(session.scheduledEndTime).getTime()
    if (!Number.isNaN(scheduledEndMs)) {
      return Math.max(0, (scheduledEndMs - Date.now()) / 1000)
    }
  }

  return Math.max(0, Number(session.remainingSeconds) || 0)
}

const getPhaseDurationSeconds = (settings, isBreak, sessionCount) => {
  if (!settings) return 0

  if (!isBreak) return settings.sessionDuration * 60

  const isLongBreak =
    sessionCount > 0 &&
    settings.sessionsBeforeLongBreak > 0 &&
    sessionCount % settings.sessionsBeforeLongBreak === 0

  return (isLongBreak ? settings.longBreakDuration : settings.shortBreakDuration) * 60
}

const getTimeString = (seconds) => {
  const safeSeconds = Math.max(0, Math.ceil(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const secs = safeSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

export const PomodoroTimerEngine = () => {
  const timer = usePomodoroTimerStore((s) => s.timer)
  const isActive = usePomodoroTimerStore((s) => s.isActive)
  const isBreak = usePomodoroTimerStore((s) => s.isBreak)
  const sessionCount = usePomodoroTimerStore((s) => s.sessionCount)
  const isGoalReached = usePomodoroTimerStore((s) => s.isGoalReached)
  const selectedTaskId = usePomodoroTimerStore((s) => s.selectedTaskId)
  const isInitialized = usePomodoroTimerStore((s) => s.isInitialized)

  const setTimer = usePomodoroTimerStore((s) => s.setTimer)
  const setIsActive = usePomodoroTimerStore((s) => s.setIsActive)
  const setIsBreak = usePomodoroTimerStore((s) => s.setIsBreak)
  const setSessionCount = usePomodoroTimerStore((s) => s.setSessionCount)
  const setIsGoalReached = usePomodoroTimerStore((s) => s.setIsGoalReached)
  const setIsInitialized = usePomodoroTimerStore((s) => s.setIsInitialized)
  const setSelectedTaskId = usePomodoroTimerStore((s) => s.setSelectedTaskId)
  const setEngineActions = usePomodoroTimerStore((s) => s.setEngineActions)
  const persistStart = usePomodoroTimerStore((s) => s.persistStart)
  const persistPause = usePomodoroTimerStore((s) => s.persistPause)
  const persistPausedSession = usePomodoroTimerStore((s) => s.persistPausedSession)
  const persistNextPhase = usePomodoroTimerStore((s) => s.persistNextPhase)
  const persistGoalReached = usePomodoroTimerStore((s) => s.persistGoalReached)

  const { settings } = useGetPomodoroSettings()
  const { serverSession, isSyncAttempted } = useGetActiveSession(!isInitialized && !!settings)
  const { endStudySession } = useEndStudySession()
  const { setXpGainedAmount, setShowXpGain } = useXpStore()
  const { socket } = useSocket()

  const workerRef = useRef(null)
  const fallbackIntervalRef = useRef(null)
  const startTimestampRef = useRef(0)
  const durationAtStartRef = useRef(0)
  const committedSessionDurationRef = useRef(null)
  const isEndingSessionRef = useRef(false)
  const sessionHandledRef = useRef(false)
  const sessionEndTimeoutRef = useRef(null)
  const lastLocalCompletionAtRef = useRef(0)
  const resumeDebounceRef = useRef(null)
  const alarmAudioRef = useRef(null)
  const breakEndAudioRef = useRef(null)

  const isActiveRef = useRef(isActive)
  const isBreakRef = useRef(isBreak)
  const sessionCountRef = useRef(sessionCount)
  const isGoalReachedRef = useRef(isGoalReached)
  const selectedTaskIdRef = useRef(selectedTaskId)
  const settingsRef = useRef(settings)

  useEffect(() => {
    isActiveRef.current = isActive
  }, [isActive])

  useEffect(() => {
    isBreakRef.current = isBreak
  }, [isBreak])

  useEffect(() => {
    sessionCountRef.current = sessionCount
  }, [sessionCount])

  useEffect(() => {
    isGoalReachedRef.current = isGoalReached
  }, [isGoalReached])

  useEffect(() => {
    selectedTaskIdRef.current = selectedTaskId
  }, [selectedTaskId])

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  const clearSessionEndTimeout = useCallback(() => {
    if (sessionEndTimeoutRef.current) {
      clearTimeout(sessionEndTimeoutRef.current)
      sessionEndTimeoutRef.current = null
    }
  }, [])

  const stopTicker = useCallback(() => {
    workerRef.current?.postMessage({ type: "STOP" })
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current)
      fallbackIntervalRef.current = null
    }
  }, [])

  const startTicker = useCallback(() => {
    processTickRef.current()
    if (workerRef.current) {
      workerRef.current.postMessage({ type: "START" })
      return
    }

    if (!fallbackIntervalRef.current) {
      fallbackIntervalRef.current = setInterval(() => processTickRef.current(), 500)
    }
  }, [])

  const syncFromServerSession = useCallback(
    (activeSession, { allowExpired = false } = {}) => {
      if (!activeSession) return false

      const plannedDuration = Number(activeSession.plannedDuration)
      const startTimeMs = new Date(activeSession.startTime).getTime()
      const durationSeconds = plannedDuration * 60
      const remaining = getRemainingSeconds(activeSession)
      const nextIsPaused = Boolean(activeSession.isPaused)

      if (!allowExpired && remaining <= 0) return false
      if (!plannedDuration || !durationSeconds || (!nextIsPaused && Number.isNaN(startTimeMs))) {
        return false
      }

      const nextIsBreak = Boolean(activeSession.isBreak)
      const nextSessionCount = Number(activeSession.sessionCount) || 0
      const taskId = activeSession.taskId || null

      startTimestampRef.current = nextIsPaused ? 0 : startTimeMs
      durationAtStartRef.current = nextIsPaused ? remaining : durationSeconds
      committedSessionDurationRef.current = nextIsBreak ? null : Math.round(plannedDuration)
      sessionHandledRef.current = false
      isEndingSessionRef.current = false
      clearSessionEndTimeout()
      if (nextIsPaused) stopTicker()

      setIsBreak(nextIsBreak)
      setSessionCount(nextSessionCount)
      setIsGoalReached(false)
      setSelectedTaskId(taskId)
      setTimer(remaining)
      if (nextIsPaused) {
        persistPausedSession(
          remaining,
          nextIsBreak,
          nextSessionCount,
          taskId,
          nextIsBreak ? null : plannedDuration,
        )
        setIsActive(false)
      } else {
        persistStart(
          startTimeMs,
          durationSeconds,
          nextIsBreak,
          nextSessionCount,
          taskId,
          nextIsBreak ? null : plannedDuration,
        )
        setIsActive(true)
      }

      return true
    },
    [
      clearSessionEndTimeout,
      persistPausedSession,
      persistStart,
      setIsActive,
      setIsBreak,
      setIsGoalReached,
      setSelectedTaskId,
      setSessionCount,
      setTimer,
      stopTicker,
    ],
  )

  const markGoalReached = useCallback(
    (nextSessionCount) => {
      stopTicker()
      startTimestampRef.current = 0
      durationAtStartRef.current = 0
      committedSessionDurationRef.current = null
      setIsActive(false)
      setTimer(0)
      setSessionCount(nextSessionCount)
      setIsGoalReached(true)
      persistGoalReached(nextSessionCount)
    },
    [persistGoalReached, setIsActive, setIsGoalReached, setSessionCount, setTimer, stopTicker],
  )

  const playAlarm = useCallback(() => {
    const currentSettings = settingsRef.current
    if (currentSettings && !currentSettings.isMuted && alarmAudioRef.current) {
      alarmAudioRef.current.currentTime = 0
      alarmAudioRef.current.play().catch(() => {})
    }

    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then((registration) => {
            registration
              .showNotification("Pomodoro", { body: "Session complete. Time for a break." })
              .catch(() => {})
          })
        } else {
          new Notification("Pomodoro", { body: "Session complete. Time for a break." })
        }
      }
    } catch {
      // Notifications are optional and should never affect the timer.
    }
  }, [])

  const startNextTimer = useCallback(
    (autoplay, nextSessionCount, nextIsBreak) => {
      const currentSettings = settingsRef.current
      if (!currentSettings) return

      const duration = getPhaseDurationSeconds(currentSettings, nextIsBreak, nextSessionCount)
      const taskId = selectedTaskIdRef.current || null

      stopTicker()
      clearSessionEndTimeout()
      sessionHandledRef.current = false
      isEndingSessionRef.current = false

      setIsBreak(nextIsBreak)
      setSessionCount(nextSessionCount)
      setIsGoalReached(false)
      setTimer(duration)

      if (!autoplay) {
        startTimestampRef.current = 0
        durationAtStartRef.current = duration
        committedSessionDurationRef.current = nextIsBreak
          ? null
          : Math.round(currentSettings.sessionDuration)
        setIsActive(false)
        persistNextPhase(nextIsBreak, nextSessionCount, duration, false, null)
        return
      }

      const now = Date.now()
      const plannedDurationMinutes = duration / 60

      startTimestampRef.current = now
      durationAtStartRef.current = duration
      committedSessionDurationRef.current = nextIsBreak ? null : Math.round(plannedDurationMinutes)
      persistStart(
        now,
        duration,
        nextIsBreak,
        nextSessionCount,
        taskId,
        nextIsBreak ? null : plannedDurationMinutes,
      )
      setIsActive(true)
      startTicker()

      if (nextIsBreak) return

      startSessionApi({
        plannedDuration: plannedDurationMinutes,
        durationSeconds: duration,
        isBreak: false,
        sessionCount: nextSessionCount,
        taskId,
      })
        .then((activeSession) => {
          syncFromServerSession(activeSession)
        })
        .catch((err) => {
          if (err?.status === 409 && err?.data?.activeSession) {
            syncFromServerSession(err.data.activeSession)
            return
          }

          console.warn("[PomodoroTimerEngine] Autoplay server registration failed.", err)
        })
    },
    [
      clearSessionEndTimeout,
      persistNextPhase,
      persistStart,
      setIsActive,
      setIsBreak,
      setIsGoalReached,
      setSessionCount,
      setTimer,
      startTicker,
      stopTicker,
      syncFromServerSession,
    ],
  )

  const handleSessionEnd = useCallback(() => {
    if (isEndingSessionRef.current) return

    const currentSettings = settingsRef.current
    if (!currentSettings) return

    const currentIsBreak = isBreakRef.current
    const currentSessionCount = sessionCountRef.current
    const currentSelectedTaskId = selectedTaskIdRef.current || null
    const nextSessionCount = currentIsBreak ? currentSessionCount : currentSessionCount + 1
    const nextIsBreak = !currentIsBreak && !currentSettings.skipBreaks
    const isGoalMet =
      !currentIsBreak &&
      currentSettings.sessionGoalCount > 0 &&
      nextSessionCount >= currentSettings.sessionGoalCount

    isEndingSessionRef.current = true
    sessionHandledRef.current = false
    setIsActive(false)
    stopTicker()
    clearSessionEndTimeout()

    if (currentIsBreak) {
      if (!currentSettings.isMuted && breakEndAudioRef.current) {
        breakEndAudioRef.current.currentTime = 0
        breakEndAudioRef.current.play().catch(() => {})
      }

      sessionHandledRef.current = true
      isEndingSessionRef.current = false
      startNextTimer(currentSettings.autoplay, currentSessionCount, false)
      return
    }

    const loggedDuration = Math.round(
      committedSessionDurationRef.current ?? currentSettings.sessionDuration,
    )
    const xpMultiplier = loggedDuration >= 120 ? 20 : loggedDuration >= 60 ? 15 : 10
    const estimatedXp = loggedDuration * xpMultiplier

    sessionEndTimeoutRef.current = setTimeout(() => {
      if (sessionHandledRef.current) return
      sessionHandledRef.current = true
      isEndingSessionRef.current = false
      cancelSessionApi().catch(() => {})
      showAppToast("Session may not have saved. Continuing.", "warning")
      startNextTimer(currentSettings.autoplay, nextSessionCount, nextIsBreak)
    }, 35_000)

    playAlarm()

    endStudySession(
      { duration: loggedDuration, taskId: currentSelectedTaskId },
      {
        onSuccess: (data) => {
          clearSessionEndTimeout()
          if (sessionHandledRef.current) return

          sessionHandledRef.current = true
          isEndingSessionRef.current = false

          const awardedXp = data?.xpResult?.xpEarned ?? estimatedXp
          setXpGainedAmount(awardedXp)
          setShowXpGain(true)
          setTimeout(() => setShowXpGain(false), 2000)

          if (data?.newUnlocks?.length > 0) {
            data.newUnlocks.forEach((itemKey) => {
              const config = WARDROBE_CONFIG[itemKey]
              if (config) showAppToast(`Unlocked: ${config.label}!`, "success")
            })
          }

          if (data?.xpResult?.levelsGained?.length > 0) {
            const milestoneLevelReached = Math.max(
              ...data.xpResult.levelsGained.filter((level) => level % 10 === 0),
            )
            if (milestoneLevelReached > 0) {
              usePomodoroTimerStore.getState().setMilestoneLevel?.(milestoneLevelReached)
              usePomodoroTimerStore.getState().setShowShareModal?.(true)
            } else {
              showAppToast(`You leveled up to Level ${data.xpResult.finalLevel}!`, "success")
            }
          }

          if (isGoalMet) {
            showAppToast(`Goal of ${currentSettings.sessionGoalCount} sessions reached!`, "success")
            lastLocalCompletionAtRef.current = Date.now()
            markGoalReached(nextSessionCount)
            return
          }

          lastLocalCompletionAtRef.current = Date.now()
          startNextTimer(currentSettings.autoplay, nextSessionCount, nextIsBreak)
        },
        onError: (err) => {
          clearSessionEndTimeout()
          if (sessionHandledRef.current) return

          sessionHandledRef.current = true
          isEndingSessionRef.current = false
          cancelSessionApi().catch(() => {})

          if (err?.status !== 404) {
            showAppToast("Session may not have saved. Continuing.", "warning")
          }

          startNextTimer(currentSettings.autoplay, nextSessionCount, nextIsBreak)
        },
      },
    )
  }, [
    clearSessionEndTimeout,
    endStudySession,
    markGoalReached,
    playAlarm,
    setIsActive,
    setShowXpGain,
    setXpGainedAmount,
    startNextTimer,
    stopTicker,
  ])

  const handleSessionEndRef = useRef(handleSessionEnd)

  useEffect(() => {
    handleSessionEndRef.current = handleSessionEnd
  }, [handleSessionEnd])

  const processTick = useCallback(() => {
    const startTime = startTimestampRef.current
    const duration = durationAtStartRef.current
    if (!startTime || !duration) return

    const remaining = duration - (Date.now() - startTime) / 1000

    if (remaining <= 0) {
      setTimer(0)
      stopTicker()
      handleSessionEndRef.current()
      return
    }

    setTimer(remaining)
  }, [setTimer, stopTicker])

  const processTickRef = useRef(processTick)

  useEffect(() => {
    processTickRef.current = processTick
  }, [processTick])

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

    if (isGoalReached) {
      document.title = "Goal Reached!"
    } else if (isActive) {
      const status = isBreak ? "Break" : "Focus"
      document.title = `${getTimeString(timer)} ${status} | Klayne`
    } else if (timer > 0) {
      document.title = `Paused - ${getTimeString(timer)}`
    } else {
      document.title = "Klayne"
    }
  }, [isActive, isBreak, isGoalReached, isInitialized, timer])

  useEffect(() => {
    if (!isActive || isBreak || isGoalReached) return

    const intervalId = setInterval(() => {
      sessionHeartbeatApi().catch(() => {})
    }, 30_000)

    return () => clearInterval(intervalId)
  }, [isActive, isBreak, isGoalReached])

  useEffect(() => {
    if (!isActive || isBreak || isGoalReached) return

    const intervalId = setInterval(() => {
      getActiveSessionApi()
        .then((activeSession) => {
          if (isEndingSessionRef.current) return

          if (activeSession) {
            syncFromServerSession(activeSession)
            return
          }

          if (!isActiveRef.current || isBreakRef.current) return

          const currentSettings = settingsRef.current
          if (!currentSettings) return

          sessionHandledRef.current = true
          isEndingSessionRef.current = false
          clearSessionEndTimeout()
          setIsActive(false)
          startNextTimer(
            currentSettings.autoplay,
            sessionCountRef.current + 1,
            !currentSettings.skipBreaks,
          )
        })
        .catch(() => {})
    }, 15_000)

    return () => clearInterval(intervalId)
  }, [
    clearSessionEndTimeout,
    isActive,
    isBreak,
    isGoalReached,
    setIsActive,
    startNextTimer,
    syncFromServerSession,
  ])

  useEffect(() => {
    if (!socket) return

    const advanceAfterExternalEnd = () => {
      if (Date.now() - lastLocalCompletionAtRef.current < 3000) return
      if (isEndingSessionRef.current) return
      if (!isActiveRef.current) return

      const currentSettings = settingsRef.current
      if (!currentSettings) return

      const currentIsBreak = isBreakRef.current
      const currentSessionCount = sessionCountRef.current
      const nextSessionCount = currentIsBreak ? currentSessionCount : currentSessionCount + 1
      const nextIsBreak = !currentIsBreak && !currentSettings.skipBreaks
      const isGoalMet =
        !currentIsBreak &&
        currentSettings.sessionGoalCount > 0 &&
        nextSessionCount >= currentSettings.sessionGoalCount

      sessionHandledRef.current = true
      isEndingSessionRef.current = false
      clearSessionEndTimeout()
      setIsActive(false)
      setTimer(0)

      if (isGoalMet) {
        markGoalReached(nextSessionCount)
        return
      }

      startNextTimer(currentSettings.autoplay, nextSessionCount, nextIsBreak)
    }

    const onSessionStarted = ({ activeSession } = {}) => {
      syncFromServerSession(activeSession)
    }

    const onSessionPaused = ({ activeSession } = {}) => {
      syncFromServerSession(activeSession)
    }

    socket.on("pomodoroSessionStarted", onSessionStarted)
    socket.on("pomodoroSessionPaused", onSessionPaused)
    socket.on("pomodoroSessionCompleted", advanceAfterExternalEnd)
    socket.on("pomodoroBreakEnded", advanceAfterExternalEnd)

    return () => {
      socket.off("pomodoroSessionStarted", onSessionStarted)
      socket.off("pomodoroSessionPaused", onSessionPaused)
      socket.off("pomodoroSessionCompleted", advanceAfterExternalEnd)
      socket.off("pomodoroBreakEnded", advanceAfterExternalEnd)
    }
  }, [
    clearSessionEndTimeout,
    markGoalReached,
    setIsActive,
    setTimer,
    socket,
    startNextTimer,
    syncFromServerSession,
  ])

  useEffect(() => {
    const handleResume = () => {
      if (!isActiveRef.current || isGoalReachedRef.current) return

      if (resumeDebounceRef.current) return
      resumeDebounceRef.current = setTimeout(() => {
        resumeDebounceRef.current = null
      }, 300)

      processTickRef.current()
      if (workerRef.current) {
        workerRef.current.postMessage({ type: "STOP" })
        workerRef.current.postMessage({ type: "START" })
      }
    }

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
      if (resumeDebounceRef.current) {
        clearTimeout(resumeDebounceRef.current)
        resumeDebounceRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const supportsWorker = typeof Worker !== "undefined"

    if (supportsWorker) {
      try {
        const worker = new Worker("/timerWorker.js")
        workerRef.current = worker
        worker.onmessage = (event) => {
          if (event.data?.type === "TICK") processTickRef.current()
        }
        worker.onerror = () => {
          worker.terminate()
          if (workerRef.current === worker) workerRef.current = null
          if (isActiveRef.current && !fallbackIntervalRef.current) {
            fallbackIntervalRef.current = setInterval(() => processTickRef.current(), 500)
          }
        }
      } catch {
        workerRef.current = null
      }
    }

    return () => {
      workerRef.current?.postMessage({ type: "STOP" })
      workerRef.current?.terminate()
      workerRef.current = null
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current)
        fallbackIntervalRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (isActive && !isGoalReached) {
      processTickRef.current()
      if (workerRef.current) {
        workerRef.current.postMessage({ type: "START" })
      } else if (!fallbackIntervalRef.current) {
        fallbackIntervalRef.current = setInterval(() => processTickRef.current(), 500)
      }
      return
    }

    stopTicker()
  }, [isActive, isGoalReached, stopTicker])

  useEffect(() => {
    if (isInitialized || !settings || !isSyncAttempted) return

    if (serverSession) {
      syncFromServerSession(serverSession, { allowExpired: true })
      setIsInitialized(true)
      return
    }

    const savedIsActive = localStorage.getItem(STORAGE_KEYS.ACTIVE) === "true"
    const savedStartTime = Number(localStorage.getItem(STORAGE_KEYS.START_TIMESTAMP))
    const savedDuration = Number(localStorage.getItem(STORAGE_KEYS.DURATION_AT_START))
    const savedPausedTime = Number(localStorage.getItem(STORAGE_KEYS.PAUSED_TIME))
    const savedIsBreak = localStorage.getItem(STORAGE_KEYS.BREAK) === "true"
    const savedSessionCount = Number(localStorage.getItem(STORAGE_KEYS.SESSION_COUNT)) || 0
    const savedGoalReached = localStorage.getItem(STORAGE_KEYS.GOAL_REACHED) === "true"
    const savedCommittedDuration = Number(localStorage.getItem(STORAGE_KEYS.COMMITTED_DURATION))
    const savedTaskId = localStorage.getItem(STORAGE_KEYS.SELECTED_TASK) || null

    setIsBreak(savedIsBreak)
    setSessionCount(savedSessionCount)
    setIsGoalReached(savedGoalReached)
    setSelectedTaskId(savedTaskId)
    committedSessionDurationRef.current =
      !savedIsBreak && savedCommittedDuration > 0 ? Math.round(savedCommittedDuration) : null

    if (savedGoalReached) {
      setTimer(0)
      setIsActive(false)
      setIsInitialized(true)
      return
    }

    if (savedIsActive && savedStartTime > 0 && savedDuration > 0) {
      const remaining = savedDuration - (Date.now() - savedStartTime) / 1000

      startTimestampRef.current = savedStartTime
      durationAtStartRef.current = savedDuration
      setTimer(Math.max(0, remaining))
      persistStart(
        savedStartTime,
        savedDuration,
        savedIsBreak,
        savedSessionCount,
        savedTaskId,
        savedIsBreak ? null : committedSessionDurationRef.current,
      )
      setIsActive(true)
      setIsInitialized(true)
      return
    }

    const fallbackDuration = getPhaseDurationSeconds(settings, savedIsBreak, savedSessionCount)
    const pausedTime = savedPausedTime > 0 ? savedPausedTime : fallbackDuration

    startTimestampRef.current = 0
    durationAtStartRef.current = pausedTime
    setTimer(pausedTime)
    setIsActive(false)
    persistPause(pausedTime)
    setIsInitialized(true)
  }, [
    isInitialized,
    isSyncAttempted,
    persistPause,
    persistStart,
    serverSession,
    setIsActive,
    setIsBreak,
    setIsGoalReached,
    setIsInitialized,
    setSelectedTaskId,
    setSessionCount,
    setTimer,
    settings,
    syncFromServerSession,
  ])

  useEffect(() => {
    setEngineActions({
      startNextTimer,
      handleSessionEnd,
      startTimestampRef,
      durationAtStartRef,
      committedSessionDurationRef,
      isEndingSessionRef,
      forceEnd: () => {
        isEndingSessionRef.current = false
        sessionHandledRef.current = false
        clearSessionEndTimeout()
        handleSessionEndRef.current()
      },
    })

    return () => {
      setEngineActions(null)
    }
  }, [clearSessionEndTimeout, handleSessionEnd, setEngineActions, startNextTimer])

  useEffect(() => {
    return () => {
      clearSessionEndTimeout()
      stopTicker()
      setEngineActions(null)
    }
  }, [clearSessionEndTimeout, setEngineActions, stopTicker])

  return null
}
