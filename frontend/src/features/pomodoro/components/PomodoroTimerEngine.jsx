import { useEffect, useRef, useCallback } from "react"
import { usePomodoroTimerStore, STORAGE_KEYS } from "../../../store/usePomodoroTimerStore"
import { useGetPomodoroSettings } from "../pomodoroHooks/usePomodoroQueries"
import { useEndStudySession } from "../pomodoroHooks/usePomodoroMutations"
import { showAppToast } from "../../../utils/showAppToast"
import useXpStore from "../../../store/useXpStore"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"

export const PomodoroTimerEngine = () => {
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

  const persistNextPhase = usePomodoroTimerStore((s) => s.persistNextPhase)

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

  // Keep refs in sync with store for use inside callbacks
  const isBreakRef = useRef(isBreak)
  const sessionCountRef = useRef(sessionCount)
  const isActiveRef = useRef(isActive)
  const settingsRef = useRef(settings)
  const selectedTaskIdRef = useRef(selectedTaskId)

  useEffect(() => {
    isBreakRef.current = isBreak
  }, [isBreak])
  useEffect(() => {
    sessionCountRef.current = sessionCount
  }, [sessionCount])
  useEffect(() => {
    isActiveRef.current = isActive
  }, [isActive])
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])
  useEffect(() => {
    selectedTaskIdRef.current = selectedTaskId
  }, [selectedTaskId])

  // ── Audio setup ─────────────────────────────────────────────────────────
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

  const playAlarm = useCallback(() => {
    const s = settingsRef.current
    if (s && !s.isMuted && alarmAudioRef.current) {
      alarmAudioRef.current.currentTime = 0
      alarmAudioRef.current.play().catch(() => {})
    }
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("Pomodoro", { body: "Session complete! Time for a break." })
    }
  }, [])

  // ── startNextTimer ───────────────────────────────────────────────────────
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
        setIsActive(true)
        persistNextPhase(nextIsBreak, nextSessionCount, duration, true, now)
      } else {
        setIsActive(false)
        persistNextPhase(nextIsBreak, nextSessionCount, duration, false, null)
      }
    },
    [setTimer, setIsBreak, setSessionCount, setIsGoalReached, setIsActive, persistNextPhase],
  )

  // ── handleSessionEnd ─────────────────────────────────────────────────────
  const handleSessionEnd = useCallback(() => {
    if (isEndingSessionRef.current) return
    const s = settingsRef.current
    if (!s) return

    isEndingSessionRef.current = true
    setIsActive(false)

    const currentIsBreak = isBreakRef.current
    const currentSessionCount = sessionCountRef.current
    const currentSelectedTaskId = selectedTaskIdRef.current

    setTimeout(() => {
      if (!currentIsBreak) {
        playAlarm()
        const newSessionCount = currentSessionCount + 1
        const isGoalMet = s.sessionGoalCount > 0 && newSessionCount >= s.sessionGoalCount

        let xpMultiplier = s.sessionDuration >= 120 ? 20 : s.sessionDuration >= 60 ? 15 : 10
        const calculatedXp = s.sessionDuration * xpMultiplier

        endStudySession(
          { duration: s.sessionDuration, taskId: currentSelectedTaskId },
          {
            onSuccess: (data) => {
              setXpGainedAmount(calculatedXp)
              setShowXpGain(true)
              setTimeout(() => setShowXpGain(false), 2000)

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

              const shouldStartBreak = !s.skipBreaks
              startNextTimer(s.autoplay, newSessionCount, shouldStartBreak)
              isEndingSessionRef.current = false
            },
            onError: (err) => {
              showAppToast(err.message || "Failed to log session.", "error")
              isEndingSessionRef.current = false
            },
          },
        )
      } else {
        if (!s.isMuted && breakEndAudioRef.current) {
          breakEndAudioRef.current.play().catch(() => {})
        }
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

  // ── Tick processor ───────────────────────────────────────────────────────
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
      handleSessionEnd()
    } else {
      setTimer(remaining)
    }
  }, [setTimer, handleSessionEnd])

  // ── Worker setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      workerRef.current = new Worker("/timerWorker.js")
      workerRef.current.onerror = () => {
        workerRef.current = null
        fallbackIntervalRef.current = setInterval(processTick, 500)
      }
      workerRef.current.onmessage = (e) => {
        if (e.data.type === "TICK") processTick()
      }
    } catch {
      fallbackIntervalRef.current = setInterval(processTick, 500)
    }

    return () => {
      workerRef.current?.postMessage({ type: "STOP" })
      workerRef.current?.terminate()
      if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current)
    }
  }, [processTick])

  // ── Start/stop worker when isActive changes ──────────────────────────────
  useEffect(() => {
    if (isActive && !isGoalReached) {
      workerRef.current?.postMessage({ type: "START" })
      if (!workerRef.current && !fallbackIntervalRef.current) {
        fallbackIntervalRef.current = setInterval(processTick, 500)
      }
    } else {
      workerRef.current?.postMessage({ type: "STOP" })
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current)
        fallbackIntervalRef.current = null
      }
    }
  }, [isActive, isGoalReached, processTick])

  // ── Hydrate from localStorage on first mount ─────────────────────────────
  useEffect(() => {
    if (isSettingsLoading || !settings || isInitialized) return

    const savedIsActive = localStorage.getItem(STORAGE_KEYS.ACTIVE) === "true"
    const savedStartTime = parseInt(localStorage.getItem(STORAGE_KEYS.START_TIMESTAMP), 10)
    const savedDurationAtStart = parseInt(localStorage.getItem(STORAGE_KEYS.DURATION_AT_START), 10)
    const savedPausedTime = parseFloat(localStorage.getItem(STORAGE_KEYS.PAUSED_TIME))
    const savedIsBreak = localStorage.getItem(STORAGE_KEYS.BREAK) === "true"
    const savedSessionCount = parseInt(localStorage.getItem(STORAGE_KEYS.SESSION_COUNT), 10) || 0
    const savedGoalReached = localStorage.getItem(STORAGE_KEYS.GOAL_REACHED) === "true"

    setIsBreak(savedIsBreak)
    setSessionCount(savedSessionCount)
    setIsGoalReached(savedGoalReached)
    setIsInitialized(true)

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
        // Timer expired while away — end session immediately
        if (authUser) {
          setTimer(0)
          setIsActive(false)
        //   handleSessionEnd()
        }
      }
    } else if (!isNaN(savedPausedTime)) {
      setTimer(savedPausedTime)
      setIsActive(false)
    } else {
      setTimer(settings.sessionDuration * 60)
      setIsActive(false)
    }
  }, [isSettingsLoading, settings, isInitialized])

  // Expose startNextTimer and handleSessionEnd for PomodoroPage to call
  // via a ref attached to a global singleton — we use a module-level ref instead
  useEffect(() => {
    window.__pomodoroEngine = {
      startNextTimer,
      handleSessionEnd,
      startTimestampRef,
      durationAtStartRef,
    }
  }, [startNextTimer, handleSessionEnd])

  return null // renders nothing, just runs logic
}
