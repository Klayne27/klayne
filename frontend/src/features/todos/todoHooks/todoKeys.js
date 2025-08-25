export const todoKeys = {
  all: ["todos"],
  lists: () => [...todoKeys.all, "lists"],
  list: (type) => [...todoKeys.lists(), type],
  completed: (type) => [...todoKeys.all, "completed", type],
  activityLog: () => [...todoKeys.all, "activityLog"]
}
