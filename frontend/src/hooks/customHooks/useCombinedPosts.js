// src/hooks/postsHooks/useCombinedPosts.js
import { useMemo } from "react"

export const useCombinedPosts = ({ posts, feedType, pinnedPosts = [] }) => {
  const combinedPosts = useMemo(() => {
    if (feedType !== "posts") {
      return posts
    }
    // Filter out pinned posts from the main `posts` array to avoid duplicates
    const filteredPosts = posts.filter(
      (post) => !pinnedPosts.some((pinned) => pinned._id === post._id),
    )
    // Combine pinned posts with filtered posts
    return [...pinnedPosts, ...filteredPosts]
  }, [posts, feedType, pinnedPosts])

  const filteredPostsForRender = useMemo(() => {
    // Only apply ref to the last *filtered* post
    if (feedType === "posts") {
      return posts.filter((post) => !pinnedPosts.some((pinned) => pinned._id === post._id))
    }
    return posts
  }, [posts, feedType, pinnedPosts])

  return { combinedPosts, filteredPostsForRender }
}
