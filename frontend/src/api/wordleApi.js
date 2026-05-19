const BASE_URL = "/api/wordle"

const parseResponse = async (res, fallbackMessage) => {
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || fallbackMessage)
  return data
}

export const getTodayWordleApi = async () => {
  const res = await fetch(`${BASE_URL}/today`, { credentials: "include" })
  return parseResponse(res, "Failed to fetch today's Wordle")
}

export const getWordleStatsApi = async () => {
  const res = await fetch(`${BASE_URL}/stats`, { credentials: "include" })
  return parseResponse(res, "Failed to fetch Wordle statistics")
}

export const submitWordleGuessApi = async (guess) => {
  const res = await fetch(`${BASE_URL}/guess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ guess }),
  })
  return parseResponse(res, "Failed to submit guess")
}

export const getWordleDailyLeaderboardApi = async (page = 1) => {
  const res = await fetch(`${BASE_URL}/leaderboard/daily?page=${page}&limit=10`, {
    credentials: "include",
  })
  return parseResponse(res, "Failed to fetch daily Wordle leaderboard")
}

export const getWordleAllTimeLeaderboardApi = async (page = 1) => {
  const res = await fetch(`${BASE_URL}/leaderboard/all-time?page=${page}&limit=10`, {
    credentials: "include",
  })
  return parseResponse(res, "Failed to fetch all-time Wordle leaderboard")
}

// ── NEW ───────────────────────────────────────────────────────────────────────
export const getWordleHistoryApi = async (page = 1, limit = 20) => {
  const res = await fetch(`${BASE_URL}/history?page=${page}&limit=${limit}`, {
    credentials: "include",
  })
  return parseResponse(res, "Failed to fetch Wordle history")
}