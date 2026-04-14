const BASE_URL = "/api/posts"

export const createReplyApi = async ({ parentId, text, img, video, isIC, isAnonymous }) => {
  const res = await fetch(`${BASE_URL}/reply/${parentId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, img, video, isIC, isAnonymous }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Something went wrong")
  return data
}

export const getPostRepliesApi = async ({ queryKey, pageParam = 1 }) => {
  const [, ,postId] = queryKey
  const res = await fetch(`${BASE_URL}/replies/${postId}?page=${pageParam}&limit=12`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch replies")
  return data
}

export const getPostThreadApi = async (postId) => {
  const res = await fetch(`${BASE_URL}/thread/${postId}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch thread")
  return data
}

export const getPostsApi = async (POST_ENDPOINT, pageParam = 1, limit = 12) => {
  const url = `${POST_ENDPOINT}?page=${pageParam}&limit=${limit}`
  const res = await fetch(url)

  const data = await res.json()

  if (!res.ok) throw new Error(data.error || "Something went wrong")
  return data
}

export const getPostApi = async (postId) => {
  const res = await fetch(`${BASE_URL}/${postId}`)
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch post")
  }
  return data
}

export const getBookmarkedPostsApi = async ({ pageParam = 1, searchQuery = "" }) => {
  const url = new URL(`${BASE_URL}/bookmarked`, window.location.origin)
  url.searchParams.append("page", pageParam)
  url.searchParams.append("limit", 10)

  if (searchQuery) {
    url.searchParams.append("query", searchQuery)
  }

  const res = await fetch(url.toString(), {})

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "Failed to load bookmarks")
  }

  return data
}

export const getPinnedPostsApi = async (username) => {
  const res = await fetch(`${BASE_URL}/profile/${username}/pinned-posts`)

  const data = await res.json()

  if (!res.ok) throw new Error(data.error || "Failed to fetch pinned posts")

  return data
}

export const getScheduledPostsApi = async () => {
  const res = await fetch(`${BASE_URL}/scheduled`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch scheduled posts")
  return data
}

export const createPostApi = async ({ text, img, video, pollOptions, scheduledAt, isIC }) => {
  const res = await fetch(`${BASE_URL}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, img, video, pollOptions, scheduledAt, isIC }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Something went wrong")

  return data
}

export const deletePostApi = async (postId) => {
  const res = await fetch(`${BASE_URL}/${postId}`, {
    method: "DELETE",
  })

  const data = res.json()

  if (!res.ok) throw new Error(data.error || "Something went wrong")

  return data
}

export const likePostApi = async (postId) => {
  const res = await fetch(`${BASE_URL}/like/${postId}`, {
    method: "POST",
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "Failed to like/unlike post: Something went wrong")
  }
  return data
}

export const toggleBookmarkApi = async (postId) => {
  const res = await fetch(`${BASE_URL}/bookmark/${postId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })

  const data = await res.json()

  if (!res.ok) throw new Error(data.error || "Failed to bookmark post")

  return data
}

export const voteOnPollApi = async ({ postId, optionId }) => {
  const res = await fetch(`${BASE_URL}/${postId}/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ postId, optionId }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || "Failed to cast vote on poll.")
  }
  return data
}

export const pinUnpinPostApi = async (postId) => {
  const res = await fetch(`${BASE_URL}/pin/${postId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  })
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || "Failed to pin post")
  }
  return res.json()
}

export const unpinPostApi = async (postId) => {
  const res = await fetch(`${BASE_URL}/pin/${postId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  })
  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || "Failed to unpin post")
  }
  return res.json()
}

export const updateScheduledPostApi = async ({ postId, postData }) => {
  const res = await fetch(`${BASE_URL}/scheduled/${postId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(postData),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to update scheduled post")
  return data
}

export const deleteMultipleScheduledPostsApi = async (postIds) => {
  const res = await fetch(`${BASE_URL}/scheduled/bulk-delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postIds }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to delete multiple scheduled posts")
  return data
}

export const markPostsAsReadApi = async () => {
  const res = await fetch(`${BASE_URL}/mark-as-read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })

  const data = await res.json()

  if (!res.ok) throw new Error(data.error || "Failed to mark posts as read")

  return data
}

export const markVentPostsAsReadApi = async () => {
  const res = await fetch(`${BASE_URL}/mark-as-read/vent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })

  const data = await res.json()

  if (!res.ok) throw new Error(data.error || "Failed to mark posts as read")

  return data
}

export const markICPostsAsReadApi = async () => {
  const res = await fetch(`${BASE_URL}/mark-as-read/ic`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })

  const data = await res.json()

  if (!res.ok) throw new Error(data.error || "Failed to mark posts as read")

  return data
}

export const createVentPostApi = async ({ text, img, video, isAnonymous, pollOptions }) => {
  const response = await fetch(`${BASE_URL}/vent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, img, video, isAnonymous, pollOptions }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || "Failed to create vent post")
  }
  return response.json()
}

export const editPostApi = async ({ postId, postData }) => {
  const res = await fetch(`${BASE_URL}/edit/${postId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postData),
  })
  const data = await res.json()

  if (!res.ok) throw new Error("Failed to edit post")

  return data
}

export const getPostHistoryApi = async (postId) => {
  const res = await fetch(`${BASE_URL}/history/${postId}`)

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch post history.")
  }

  return data
}
