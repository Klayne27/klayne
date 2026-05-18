import { useCallback, useEffect, useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  cancelSessionApi,
  endStudySessionApi,
  getServerTimeApi,
  pauseSessionApi,
  startSessionApi,
  updatePomodoroSettingsApi,
  updateSessionTaskApi,
} from "../../../api/pomodoroApi"
import { showAppToast } from "../../../utils/showAppToast"
import { usePomodoroTimerStore } from "../../../store/usePomodoroTimerStore"
import { userKeys } from "../../users/usersHooks/userKeys"
import { wardrobeKeys } from "../../wardrobe/wardrobeHooks"
import { pomodoroKeys } from "./pomodoroKeys"

const getRemainingSeconds = (activeSession) => {
  if (!activeSession) return 0

  if (activeSession.isPaused) {
    return Math.max(
      0,
      Number(activeSession.pausedRemainingSeconds ?? activeSession.remainingSeconds) || 0,
    )
  }

  if (activeSession.scheduledEndTime) {
    const scheduledEndMs = new Date(activeSession.scheduledEndTime).getTime()
    if (!Number.isNaN(scheduledEndMs)) {
      return Math.max(0, (scheduledEndMs - Date.now()) / 1000)
    }
  }

  return Math.max(0, Number(activeSession.remainingSeconds) || 0)
}

const syncStoreToActiveSession = (activeSession, queryClient) => {
  const remaining = getRemainingSeconds(activeSession)
  if (!activeSession || remaining <= 0) return

  const store = usePomodoroTimerStore.getState()
  const engineActions = store.engineActions
  const startTimeMs = new Date(activeSession.startTime).getTime()
  const durationSeconds = Number(activeSession.plannedDuration) * 60
  const taskId = activeSession.taskId || null

  if (durationSeconds > 0 && engineActions) {
    engineActions.startTimestampRef.current = activeSession.isPaused ? 0 : startTimeMs
    engineActions.durationAtStartRef.current = activeSession.isPaused ? remaining : durationSeconds
    if (!activeSession.isBreak && engineActions.committedSessionDurationRef) {
      engineActions.committedSessionDurationRef.current = Math.round(
        Number(activeSession.plannedDuration),
      )
    }
  }

  store.setIsBreak(Boolean(activeSession.isBreak))
  store.setSessionCount(Number(activeSession.sessionCount) || 0)
  store.setIsGoalReached(false)
  store.setTimer(remaining)
  if (taskId) store.setSelectedTaskId(taskId)

  if (activeSession.isPaused) {
    store.persistPausedSession(
      remaining,
      Boolean(activeSession.isBreak),
      Number(activeSession.sessionCount) || 0,
      taskId,
      activeSession.isBreak ? null : Number(activeSession.plannedDuration),
    )
    store.setIsActive(false)
  } else if (!Number.isNaN(startTimeMs)) {
    store.persistStart(
      startTimeMs,
      durationSeconds,
      Boolean(activeSession.isBreak),
      Number(activeSession.sessionCount) || 0,
      taskId,
      activeSession.isBreak ? null : Number(activeSession.plannedDuration),
    )
    store.setIsActive(true)
  }

  queryClient.setQueryData(pomodoroKeys.active(), activeSession)
}

export const useEndStudySession = () => {
  const queryClient = useQueryClient()
  const inFlightRef = useRef(false)

  const { mutate: endStudySessionRaw } = useMutation({
    mutationFn: endStudySessionApi,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    onMutate: async ({ duration }) => {
      await queryClient.cancelQueries({ queryKey: userKeys.auth() })
      await queryClient.cancelQueries({ queryKey: pomodoroKeys.leaderboard })

      const previousAuthUser = queryClient.getQueryData(userKeys.auth())

      queryClient.setQueryData(userKeys.auth(), (oldUser) => {
        if (!oldUser) return oldUser

        return {
          ...oldUser,
          totalStudyDuration: (oldUser.totalStudyDuration || 0) + duration,
          totalSessionsCompleted: (oldUser.totalSessionsCompleted || 0) + 1,
          monthlyStats: {
            ...oldUser.monthlyStats,
            studyDuration: (oldUser.monthlyStats?.studyDuration || 0) + duration,
            sessionsCompleted: (oldUser.monthlyStats?.sessionsCompleted || 0) + 1,
          },
        }
      })

      return { previousAuthUser }
    },
    onSuccess: () => {
      inFlightRef.current = false
      queryClient.invalidateQueries({ queryKey: userKeys.auth() })
      queryClient.invalidateQueries({ queryKey: pomodoroKeys.leaderboard })
      queryClient.invalidateQueries({ queryKey: wardrobeKeys.inventory() })
      queryClient.removeQueries({ queryKey: pomodoroKeys.active() })
    },
    onError: (error, variables, context) => {
      inFlightRef.current = false

      if (error?.status !== 404 && context?.previousAuthUser) {
        queryClient.setQueryData(userKeys.auth(), context.previousAuthUser)
      }

      queryClient.invalidateQueries({ queryKey: userKeys.auth() })
      queryClient.invalidateQueries({ queryKey: pomodoroKeys.leaderboard })
      queryClient.removeQueries({ queryKey: pomodoroKeys.active() })
    },
  })

  const endStudySession = useCallback(
    (variables, options) => {
      if (inFlightRef.current) return false
      inFlightRef.current = true
      endStudySessionRaw(variables, options)
      return true
    },
    [endStudySessionRaw],
  )

  return { endStudySession }
}

export const useStartSession = () => {
  const queryClient = useQueryClient()

  const { mutate: startSession, isPending: isStarting } = useMutation({
    mutationFn: ({ timerSeconds, plannedDurationMinutes, isBreak, sessionCount, taskId }) => {
      if (isBreak) {
        return Promise.resolve({
          clientOnly: true,
          isBreak,
          sessionCount,
          taskId,
          plannedDuration: plannedDurationMinutes,
          durationSeconds: timerSeconds,
        })
      }

      return startSessionApi({
        plannedDuration: plannedDurationMinutes,
        durationSeconds: timerSeconds,
        isBreak: false,
        sessionCount,
        taskId,
      })
    },
    onMutate: ({ timerSeconds, plannedDurationMinutes, isBreak, sessionCount, taskId }) => {
      const now = Date.now()
      const durationSeconds = Math.max(0, Number(timerSeconds) || 0)
      const store = usePomodoroTimerStore.getState()
      const engineActions = store.engineActions

      if (engineActions) {
        engineActions.startTimestampRef.current = now
        engineActions.durationAtStartRef.current = durationSeconds
        if (!isBreak && engineActions.committedSessionDurationRef) {
          engineActions.committedSessionDurationRef.current = Math.round(
            Number(plannedDurationMinutes),
          )
        }
      }

      store.setIsBreak(Boolean(isBreak))
      store.setSessionCount(Number(sessionCount) || 0)
      store.setIsGoalReached(false)
      store.setTimer(durationSeconds)
      store.persistStart(
        now,
        durationSeconds,
        Boolean(isBreak),
        Number(sessionCount) || 0,
        taskId || null,
        isBreak ? null : Number(plannedDurationMinutes),
      )
      store.setIsActive(true)
    },
    onSuccess: (data) => {
      if (data?.clientOnly) return

      syncStoreToActiveSession(data, queryClient)
    },
    onError: (err) => {
      if (err?.status === 409 && err?.data?.activeSession) {
        syncStoreToActiveSession(err.data.activeSession, queryClient)
        showAppToast("Synced to your active session from another device.")
        return
      }

      console.warn("[useStartSession] Server registration failed; keeping local timer active.", err)
    },
  })

  return { startSession, isStarting }
}

export const usePauseSession = () => {
  const queryClient = useQueryClient()

  const { mutate: cancelServerSession } = useMutation({
    mutationFn: cancelSessionApi,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: pomodoroKeys.active() })
    },
    onError: () => {
      // Non-fatal — TTL cleans up stale sessions automatically.
    },
  })

  // FIX: pauseServerSession was missing from the returned object.
  //
  // PomodoroPage destructures BOTH pauseServerSession and cancelServerSession:
  //   const { pauseServerSession, cancelServerSession } = usePauseSession()
  //
  // Without this export, pauseServerSession was `undefined`. Calling it in
  // handlePause threw a TypeError AFTER setIsActive(false) and persistPause()
  // had already run — so the client paused correctly but the server's
  // ActiveSession was never cancelled.  The stale session then sat in the DB
  // until MongoDB's TTL index deleted it (scheduledEndTime + 5 min).  If the
  // user resumed and finished after that window, endSession found no
  // ActiveSession, the legacy fallback had no `duration` in the body, and
  // the session was silently lost.
  //
  // Both pause and cancel call the same cancelSessionApi — pause deletes the
  // record so a fresh one is created on resume with the correct remaining time.
  const pauseServerSession = cancelServerSession

  return { cancelServerSession, pauseServerSession }
}

export const useUpdatePomodoroSettings = () => {
  const queryClient = useQueryClient()

  const { mutate: updateSettings, isPending: isUpdatingSettings } = useMutation({
    mutationFn: updatePomodoroSettingsApi,
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: pomodoroKeys.settings() })

      const previousSettings = queryClient.getQueryData(pomodoroKeys.settings())

      queryClient.setQueryData(pomodoroKeys.settings(), (oldSettings) => ({
        ...oldSettings,
        ...newSettings,
      }))

      return { previousSettings }
    },
    onError: (err, newSettings, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(pomodoroKeys.settings(), context.previousSettings)
      }
      console.error("Failed to update Pomodoro settings. Rolling back.", err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pomodoroKeys.settings() })
    },
  })

  return { updateSettings, isUpdatingSettings }
}

export const useServerTimeOffset = () => {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const measure = async () => {
      const before = Date.now()
      try {
        const serverTime = await getServerTimeApi()
        const rtt = Date.now() - before
        // Account for ~half RTT (approximate one-way latency)
        setOffset(serverTime - (before + rtt / 2))
      } catch {
        // Swallow — offset stays 0, worst case timer is off by a handful of seconds
      }
    }
    measure()
  }, [])

  return offset
}


/**
 * Drop-in replacement for setSelectedTaskId in any UI that lets the user
 * change their focused task.
 *
 * - Updates Zustand + localStorage immediately (optimistic)
 * - Fires a PATCH to keep ActiveSession.taskId in sync when a focus session
 *   is running so other devices and the final session log stay correct
 * - Emits pomodoroTaskUpdated via socket so other open tabs/devices update
 */
export const useSelectTask = () => {
  const queryClient = useQueryClient()

  const setSelectedTaskId = usePomodoroTimerStore((s) => s.setSelectedTaskId)

  const { mutate: syncTaskToServer } = useMutation({
    mutationFn: updateSessionTaskApi,
    onSuccess: (data) => {
      if (!data?.noSession) {
        // Keep the active-session cache consistent
        queryClient.setQueryData(pomodoroKeys.active(), (old) =>
          old ? { ...old, taskId: data.taskId } : old,
        )
      }
    },
    onError: () => {
      // Task sync is best-effort; local state is already updated so the
      // session-end path will still use the correct taskId from the store.
    },
  })

  const selectTask = useCallback(
    (taskId) => {
      const id = taskId || null

      // 1. Local state — always, immediately
      setSelectedTaskId(id)

      // 2. Server sync — only during an active focus session (not breaks)
      //    Read from getState() to avoid stale closure over isActive/isBreak
      const { isActive, isBreak } = usePomodoroTimerStore.getState()
      if (isActive && !isBreak) {
        syncTaskToServer({ taskId: id })
      }
    },
    [setSelectedTaskId, syncTaskToServer],
  )

  return selectTask
}