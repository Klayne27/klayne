const BASE_URL = "/api/study"

const readJson = async (res) => {
  const text = await res.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

const apiError = (message, res, data) =>
  Object.assign(new Error(data?.error || message), {
    status: res.status,
    data,
  })

export const getPomodoroSettingsApi = async () => {
  const res = await fetch(`${BASE_URL}/users/settings/pomodoro`)
  const data = await readJson(res)

  if (!res.ok) {
    throw apiError("Failed to fetch Pomodoro settings", res, data)
  }

  return data
}

export const updatePomodoroSettingsApi = async (settings) => {
  const res = await fetch(`${BASE_URL}/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  })
  const data = await readJson(res)

  if (!res.ok) {
    throw apiError("Failed to update Pomodoro settings", res, data)
  }

  return data
}

export const getStudyActivityFeedApi = async (page = 1) => {
  const res = await fetch(`${BASE_URL}/activity?page=${page}&limit=10`)
  const data = await readJson(res)

  if (!res.ok) {
    throw apiError("Failed to fetch study activity feed", res, data)
  }

  return data
}

export const getAllSessionsApi = async () => {
  const res = await fetch(`${BASE_URL}/history`)
  const data = await readJson(res)

  if (!res.ok) {
    throw apiError("Failed to fetch all sessions", res, data)
  }

  return data
}

export const startSessionApi = async ({
  plannedDuration,
  durationSeconds,
  isBreak = false,
  sessionCount = 0,
  taskId = null,
}) => {
  const res = await fetch(`${BASE_URL}/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plannedDuration, durationSeconds, isBreak, sessionCount, taskId }),
  })
  const data = await readJson(res)

  if (!res.ok) {
    throw apiError("Failed to start session", res, data)
  }

  return data
}

export const getActiveSessionApi = async () => {
  const res = await fetch(`${BASE_URL}/session/active`)
  const data = await readJson(res)

  if (!res.ok) {
    throw apiError("Failed to fetch active session", res, data)
  }

  return data
}

export const cancelSessionApi = async () => {
  const res = await fetch(`${BASE_URL}/session/active`, { method: "DELETE" })
  const data = await readJson(res)

  if (res.status === 404) {
    return { message: "No active session to cancel.", alreadyGone: true }
  }

  if (!res.ok) {
    throw apiError("Failed to cancel session", res, data)
  }

  return data
}

export const pauseSessionApi = async ({ remainingSeconds } = {}) => {
  const res = await fetch(`${BASE_URL}/session/pause`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ remainingSeconds }),
  })
  const data = await readJson(res)

  if (res.status === 404) {
    return { message: "No active session to pause.", alreadyGone: true }
  }

  if (!res.ok) {
    throw apiError("Failed to pause session", res, data)
  }

  return data
}

export const sessionHeartbeatApi = async () => {
  const res = await fetch(`${BASE_URL}/session/heartbeat`, { method: "POST" })
  const data = await readJson(res)

  if (!res.ok) {
    throw apiError("Heartbeat failed", res, data)
  }

  return data
}

export const endStudySessionApi = async ({ taskId, duration } = {}) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10_000)

  try {
    const res = await fetch(`${BASE_URL}/session/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, duration }),
      signal: controller.signal,
    })
    const data = await readJson(res)

    if (!res.ok) {
      throw apiError("Failed to save session", res, data)
    }

    return data
  } finally {
    clearTimeout(timeoutId)
  }
}

// pomodoroApi.js — add these

export const getLiveSessionsApi = async () => {
  const res = await fetch("/api/study/sessions/live")
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch live sessions")
  return data // SessionCard[]
}

export const getServerTimeApi = async () => {
  const res = await fetch("/api/study/server-time")
  const data = await res.json()
  if (!res.ok) throw new Error("Failed to fetch server time")
  return data.serverTime // Unix ms
}

export const updateSessionTaskApi = async ({ taskId }) => {
  const res = await fetch(`${BASE_URL}/session/task`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId: taskId || null }),
  })
  const data = await readJson(res)
  if (!res.ok) throw apiError("Failed to update session task", res, data)
  return data
}