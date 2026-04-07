export const boardKeys = {
  all: ["board"],
  list: () => [...boardKeys.all, "list"],
  detail: (id) => [...boardKeys.all, "detail", id],
  comments: (id) => [...boardKeys.all, "comments", id],
}
