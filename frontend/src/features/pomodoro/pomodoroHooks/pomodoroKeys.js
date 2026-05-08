export const pomodoroKeys = {
  all: ["pomodoro"],
  leaderboard: ["leaderboard"],

  active: () => ["pomodoro", "active-session"],

  settings: () => [...pomodoroKeys.all, "settings"],
  studyActivity: () => [...pomodoroKeys.all, "studyActivity"],
  studyActivityPage: (page) => [...pomodoroKeys.studyActivity(), "page", page],

  leaderboardTotal: () => [...pomodoroKeys.leaderboard, "total"],
  leaderboardTotalPage: (page) => [...pomodoroKeys.leaderboardTotal(), "page", page],

  leaderboardMonthly: () => [...pomodoroKeys.leaderboard, "monthly"],
  leaderboardMonthlyPage: (page) => [...pomodoroKeys.leaderboardMonthly(), "page", page],

  leaderboardWeekly: () => [...pomodoroKeys.leaderboard, "weekly"],
  leaderboardWeeklyPage: (page) => [...pomodoroKeys.leaderboardWeekly(), "page", page],

  leaderboardMonthlyWinners: () => [...pomodoroKeys.leaderboard, "monthlyWinners"],
  leaderboardWeeklyWinners: () => [...pomodoroKeys.leaderboard, "weeklyWinners"],
}
