const BASE_URL = "/api/leaderboard"

export const getTotalLeaderboardApi = async (page = 1) => {
  const res = await fetch(`${BASE_URL}/total?page=${page}&limit=10`, {
    credentials: "include",
  })
  if (!res.ok) {
    throw new Error("Failed to fetch total leaderboard")
  }
  return res.json()
}

export const getMonthlyLeaderboardApi = async (page = 1) => {
  const res = await fetch(`${BASE_URL}/monthly?page=${page}&limit=10`, {
    credentials: "include",
  })
  if (!res.ok) {
    throw new Error("Failed to fetch monthly leaderboard")
  }
  return res.json()
}


export const getPreviousMonthWinnersApi = async () => {
  const res = await fetch(`${BASE_URL}/monthly/previous-winners`)

  if (!res.ok) {
    throw new Error("Failed to fetch previous winners")
  }

  return res.json()
}


export const getWeeklyLeaderboardApi = async (page = 1) => {
  const res = await fetch(`${BASE_URL}/weekly?page=${page}&limit=10`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error("Failed to fetch weekly leaderboard")
  return res.json()
}

export const getPreviousWeekWinnersApi = async () => {
  const res = await fetch(`${BASE_URL}/weekly/previous-winners`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error("Failed to fetch previous week winners")
  return res.json()
}