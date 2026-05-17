export const wordleKeys = {
  all: ["wordle"],
  today: () => [...wordleKeys.all, "today"],
  leaderboard: () => [...wordleKeys.all, "leaderboard"],
  dailyLeaderboard: (page) => [...wordleKeys.leaderboard(), "daily", page],
  allTimeLeaderboard: (page) => [...wordleKeys.leaderboard(), "all-time", page],
}
