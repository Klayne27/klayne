export const conversationKeys = {
  all: ["conversations"],
  list: () => [...conversationKeys.all, "list"],
  betweenUsers: (otherUserId) => [...conversationKeys.all, "betweenUsers", otherUserId],
  followedUsers: (searchQuery) => [...conversationKeys.all, "followedUsers", searchQuery],
  search: (q) => [...conversationKeys.all, "search", q],
}
