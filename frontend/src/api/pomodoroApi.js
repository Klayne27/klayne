const BASE_URL = "/api/study"

export const getPomodoroSettings = async () => {
  const res = await fetch(`${BASE_URL}/users/settings/pomodoro`)
  if (!res.ok) {
    throw new Error("Failed to fetch Pomodoro settings")
  }
  return res.json()
}

export const updatePomodoroSettings = async (settings) => {
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

export const startStudySession = async () => {
  const res = await fetch(`${BASE_URL}/session/start`, {
    method: "POST",
  })
  if (!res.ok) {
    throw new Error("Failed to start study session")
  }
  return res.json()
}

export const endStudySession = async ({ duration }) => {
  const res = await fetch(`${BASE_URL}/session/end`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ duration }),
  })
  if (!res.ok) {
    throw new Error("Failed to end study session")
  }
  return res.json()
}

export const getStudyActivityFeed = async (page = 1) => {
  const res = await fetch(`${BASE_URL}/activity?page=${page}&limit=10`)
  if (!res.ok) {
    throw new Error("Failed to fetch study activity feed")
  }
  return res.json()
}

export const getLeaderboard = async (page = 1) => {
  const res = await fetch(`${BASE_URL}/hours-leaderboard?page=${page}&limit=10`)
  if (!res.ok) {
    throw new Error("Failed to fetch leaderboard")
  }
  return res.json()
}
