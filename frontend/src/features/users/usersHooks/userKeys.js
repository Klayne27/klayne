export const userKeys = {
  all: ["users"],

  profiles: () => [...userKeys.all, "profile"],
  profile: (username) => [...userKeys.profiles(), username],

  search: (query) => [...userKeys.all, "search", query],
  auth: () => [...userKeys.all, "auth"],

  lists: () => [...userKeys.all, "list"],
  followList: (type, userId) => [...userKeys.lists(), type, userId],
  suggestedList: () => [...userKeys.lists(), "suggestedUsers"],
  stats: (username) => [...userKeys.all, "stats", username],
}
