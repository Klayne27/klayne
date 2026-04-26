const BASE_URL = "/api/study"

export const getPomodoroSettingsApi = async () => {
  const res = await fetch(`${BASE_URL}/users/settings/pomodoro`)
  if (!res.ok) {
    throw new Error("Failed to fetch Pomodoro settings")
  }
  return res.json()
}

export const updatePomodoroSettingsApi = async (settings) => {
  const res = await fetch(`${BASE_URL}/settings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(settings),
  })
  if (!res.ok) {
    throw new Error("Failed to update Pomodoro settings")
  }
  return res.json()
}

// export const endStudySessionApi = async ({ duration }) => {
//   const res = await fetch(`${BASE_URL}/session/end`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({ duration }),
//   })
//   if (!res.ok) {
//     throw new Error("Failed to end study session")
//   }
//   return res.json()
// }

export const endStudySessionApi = async ({duration}) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10_000) // 10s max per attempt

  try {
    const res = await fetch(`${BASE_URL}/session/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({duration}),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || "Failed to save session")
    return json
  } catch (err) {
    clearTimeout(timeoutId)
    throw err
  }
}

export const getStudyActivityFeedApi = async (page = 1) => {
  const res = await fetch(`${BASE_URL}/activity?page=${page}&limit=10`)
  if (!res.ok) {
    throw new Error("Failed to fetch study activity feed")
  }
  return res.json()
}

export const getAllSessionsApi = async () => {
  const res = await fetch(`${BASE_URL}/history`)
  const data = await res.json()

  if (!res.ok) throw new Error("Failed to fetch all sessions")

  return data
}
