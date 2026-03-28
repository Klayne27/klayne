export const devlogKeys = {
  all: ["devlogs"],
  list: () => [...devlogKeys.all, "list"],
  detail: (id) => [...devlogKeys.all, "detail", id],
  comments: (id) => [...devlogKeys.all, "comments", id],
}
