export const postKeys = {
  all: ["posts"],
  list: (type) => [...postKeys.all, "list", type],
  pinned: (username) => [...postKeys.all, "pinned", username],
  details: (postId) => [...postKeys.all, "details", postId],
  bookmarked: (searchQuery) => [...postKeys.all, "bookmarked", searchQuery],
  likes: (username) => [...postKeys.all, "likes", username],
  userReplies: (username) => [...postKeys.all, "userReplies", username],
  userMedia: (username) => [...postKeys.all, "userMedia", username],
  user: (username) => [...postKeys.all, "user", username],
  replies: (postId) => [...postKeys.all, "replies", postId],
  thread: (postId) => [...postKeys.all, "thread", postId],
}
