// hooks/customHooks/useLiveSessions.js
import { useState, useEffect, useCallback, useRef } from "react"
import { useSocket } from "../../context/SocketContext"
import { getLiveSessionsApi } from "../../api/pomodoroApi"

export const useLiveSessions = () => {
  const [sessions, setSessions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const { socket } = useSocket()

  // Track whether the initial fetch has settled so we can safely apply
  // any socket events that arrived while the request was in-flight.
  const pendingUpdatesRef = useRef([])
  const fetchedRef = useRef(false)

  const fetchSessions = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    pendingUpdatesRef.current = []
    fetchedRef.current = false

    try {
      const data = await getLiveSessionsApi()

      // Replay any socket events that arrived while fetching
      let merged = [...data]
      for (const { type, payload } of pendingUpdatesRef.current) {
        if (type === "start") {
          const exists = merged.some((s) => s.userId === payload.userId)
          merged = exists
            ? merged.map((s) => (s.userId === payload.userId ? payload : s))
            : [...merged, payload]
        } else if (type === "stop") {
          merged = merged.filter((s) => s.userId !== payload.userId)
        }
      }

      setSessions(merged)
      fetchedRef.current = true
    } catch (err) {
      setError(err.message)
      fetchedRef.current = true
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  useEffect(() => {
    if (!socket) return

    // ── Join room ─────────────────────────────────────────────────────────
    socket.emit("join_pomodoro_room")

    const onStarted = (sessionCard) => {
      if (!fetchedRef.current) {
        // Fetch still in-flight — queue it
        pendingUpdatesRef.current.push({ type: "start", payload: sessionCard })
        return
      }
      setSessions((prev) => {
        const exists = prev.some((s) => s.userId === sessionCard.userId)
        return exists
          ? prev.map((s) => (s.userId === sessionCard.userId ? sessionCard : s))
          : [...prev, sessionCard]
      })
    }

    const onStopped = ({ userId }) => {
      if (!fetchedRef.current) {
        pendingUpdatesRef.current.push({ type: "stop", payload: { userId } })
        return
      }
      setSessions((prev) => prev.filter((s) => s.userId !== userId))
    }

    socket.on("live_session_started", onStarted)
    socket.on("live_session_stopped", onStopped)

    return () => {
      socket.off("live_session_started", onStarted)
      socket.off("live_session_stopped", onStopped)
      // ── Bug 2 fix: leave the room on unmount ──────────────────────────
      socket.emit("leave_pomodoro_room")
    }
  }, [socket])

  return { sessions, isLoading, error, refetch: fetchSessions }
}
