const BASE_URL = "/api"

export const getTotalLeaderboardApi = async (page = 1) => {
  const res = await fetch(`${BASE_URL}/leaderboard/total?page=${page}&limit=10`, {
    credentials: "include",
  })
  if (!res.ok) {
    throw new Error("Failed to fetch total leaderboard")
  }
  return res.json()
}

export const getMonthlyLeaderboardApi = async (page = 1) => {
  const res = await fetch(`${BASE_URL}/leaderboard/monthly?page=${page}&limit=10`, {
    credentials: "include",
  })
  if (!res.ok) {
    throw new Error("Failed to fetch monthly leaderboard")
  }
  return res.json()
}


export const getPreviousWinnersApi = async () => {
  const res = await fetch(`${BASE_URL}/leaderboard/previous-winners`)

  if (!res.ok) {
    throw new Error("Failed to fetch previous winners")
  }

  return res.json()
}