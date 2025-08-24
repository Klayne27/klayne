// export const postKeys = {
//   all: ["posts"],
//   lists: () => [...postKeys.all, "lists"],
//   list: (endpoint) => [...postKeys.all, "list", endpoint],
//   pinned: (username) => [...postKeys.all, "pinned", username],
//   details: (postId) => [...postKeys.all, "details", postId],
// }

export const postKeys = {
  all: ["posts"],
  list: (type) => [...postKeys.all, "list", type],
  pinned: (username) => [...postKeys.all, "pinned", username],
  details: (postId) => [...postKeys.all, "details", postId],
  bookmarked: (searchQuery) => [...postKeys.all, "bookmarked", searchQuery],
  likes: (username) => [...postKeys.all, "likes", username],
}