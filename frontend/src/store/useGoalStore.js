import { create } from "zustand"

export const useGoalStore = create((set) => ({
  dailyGoalHours: 2,
  weeklyGoalHours: 14,
  dailyTodoGoal: 5,
  weeklyTodoGoal: 30,

  updateGoal: (goalType, newValue) =>
    set((state) => {
      switch (goalType) {
        case "study":
          return { dailyGoalHours: parseFloat(newValue) || 0 }
        case "weekly_study":
          return { weeklyGoalHours: parseFloat(newValue) || 0 }
        case "daily_todo":
          return { dailyTodoGoal: parseInt(newValue, 10) || 0 }
        case "weekly_todo":
          return { weeklyTodoGoal: parseInt(newValue, 10) || 0 }

        default:
          return state
      }
    }),
}))
