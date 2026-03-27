export const groupKeys = {
  all: ["groups"],
  list: () => [...groupKeys.all, "list"],
  detail: (groupId) => [...groupKeys.all, "detail", groupId],
  members: (groupId) => [...groupKeys.all, "members", groupId],
  joinRequests: (groupId) => [...groupKeys.all, "joinRequests", groupId],
}
