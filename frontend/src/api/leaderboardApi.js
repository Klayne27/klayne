const BASE_URL = "/api"

// Get total (all-time) leaderboard
export const getTotalLeaderboard = async (page = 1) => {
  const res = await fetch(`${BASE_URL}/leaderboard/total?page=${page}&limit=10`, {
    credentials: "include",
  })
  if (!res.ok) {
    throw new Error("Failed to fetch total leaderboard")
  }
  return res.json()
}

// Get monthly leaderboard
export const getMonthlyLeaderboard = async (page = 1) => {
  const res = await fetch(`${BASE_URL}/leaderboard/monthly?page=${page}&limit=10`, {
    credentials: "include",
  })
  if (!res.ok) {
    throw new Error("Failed to fetch monthly leaderboard")
  }
  return res.json()
}

// Get leaderboard statistics
export const getLeaderboardStats = async () => {
  const res = await fetch(`${BASE_URL}/leaderboard/stats`, {
    credentials: "include",
  })
  if (!res.ok) {
    throw new Error("Failed to fetch leaderboard stats")
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

// Legacy function - now points to total leaderboard for backward compatibility
export const getLeaderboard = async (page = 1) => {
  return getTotalLeaderboard(page)
}
