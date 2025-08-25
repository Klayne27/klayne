export const pomodoroKeys = {
  // Base keys
  all: ["pomodoro"],
  leaderboard: ["leaderboard"],

  // Pomodoro settings
  settings: () => [...pomodoroKeys.all, "settings"],

  // Pomodoro study activity
  studyActivity: () => [...pomodoroKeys.all, "studyActivity"],
  studyActivityPage: (page) => [...pomodoroKeys.studyActivity(), "page", page],

  // Leaderboard
  leaderboardTotal: () => [...pomodoroKeys.leaderboard, "total"],
  leaderboardTotalPage: (page) => [...pomodoroKeys.leaderboardTotal(), "page", page],

  leaderboardMonthly: () => [...pomodoroKeys.leaderboard, "monthly"],
  leaderboardMonthlyPage: (page) => [...pomodoroKeys.leaderboardMonthly(), "page", page],

  leaderboardWinners: () => [...pomodoroKeys.leaderboard, "winners"],
}
