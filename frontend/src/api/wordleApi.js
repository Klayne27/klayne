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
