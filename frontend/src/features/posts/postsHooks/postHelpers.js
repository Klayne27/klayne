export const POST_NAMESPACES = ["posts", "hashtags"]

export const updatePostLikes = (oldData, postId, userId) => {
  if (!oldData) return oldData

  const handlePost = (post) => {
    if (!post) return post

    // 1. Determine the actual target (handling repost logic)
    const isRepost = post.repostedFrom?._id === postId
    const targetPost = isRepost ? post.repostedFrom : post

    let updatedPost = { ...post }

    // 2. If this post (or its reposted source) is the one being liked
    if (targetPost._id === postId) {
      const isLiked = targetPost.likes?.includes(userId)
      const newLikes = isLiked
        ? (targetPost.likes || []).filter((id) => id !== userId)
        : [...(targetPost.likes || []), userId]

      if (isRepost) {
        updatedPost = {
          ...post,
          repostedFrom: { ...targetPost, likes: newLikes },
        }
      } else {
        updatedPost = { ...post, likes: newLikes }
      }
    }

    // 3. NEW: Recursive Check for Nested firstChildReply
    // We must check this even if the parent post wasn't the target
    if (updatedPost.firstChildReply) {
      const updatedChild = handlePost(updatedPost.firstChildReply)
      if (updatedChild !== updatedPost.firstChildReply) {
        updatedPost = {
          ...updatedPost,
          firstChildReply: updatedChild,
        }
      }
    }

    return updatedPost
  }

  // --- Rest of your logic remains the same ---

  // 1. Handle Infinite Query Pages (Main feeds / Replies)
  if (oldData.pages) {
    const newPages = oldData.pages.map((page) => ({
      ...page,
      posts: page.posts ? page.posts.map(handlePost) : undefined,
      replies: page.replies ? page.replies.map(handlePost) : undefined,
    }))
    return { ...oldData, pages: newPages }
  }

  // 2. Handle Thread Object (Ancestors and the Hero Post)
  if (oldData.ancestors || oldData.post) {
    return {
      ...oldData,
      post: oldData.post ? handlePost(oldData.post) : oldData.post,
      ancestors: oldData.ancestors ? oldData.ancestors.map(handlePost) : oldData.ancestors,
    }
  }

  // 3. Handle single post
  if (oldData._id) return handlePost(oldData)

  // 4. Handle simple arrays
  if (Array.isArray(oldData)) return oldData.map(handlePost)

  return oldData
}

export const updatePostPinStatus = (oldData, postId, action) => {
  if (!oldData) return oldData

  const handleSinglePost = (post) => {
    const isTarget = post._id === postId || post.repostedFrom?._id === postId
    if (!isTarget) return post

    const targetPost = post.repostedFrom?._id === postId ? post.repostedFrom : post
    const newPinStatus = action === "pin"

    if (post.repostedFrom?._id === postId) {
      return { ...post, repostedFrom: { ...targetPost, isPinned: newPinStatus } }
    }
    return { ...post, isPinned: newPinStatus }
  }

  if (oldData.pages) {
    const newPages = oldData.pages.map((page) => ({
      ...page,
      posts: (page.posts || []).map(handleSinglePost),
    }))
    return { ...oldData, pages: newPages }
  }

  if (oldData._id) {
    return handleSinglePost(oldData)
  }

  if (Array.isArray(oldData)) {
    const targetPost = oldData.find((p) => p._id === postId)
    if (action === "pin") {
      return targetPost ? oldData : [handleSinglePost({ _id: postId }), ...oldData]
    }
    if (action === "unpin") {
      return oldData.filter((p) => p._id !== postId)
    }
  }

  return oldData
}

export const updatePostRepostStatus = (oldData, postId, userId) => {
  if (!oldData) return oldData

  const handlePost = (post) => {
    if (!post) return post

    // 1. Handle Repost/Target logic
    const isRepost = post.repostedFrom?._id === postId
    const targetPost = isRepost ? post.repostedFrom : post

    let updatedPost = { ...post }

    if (targetPost._id === postId) {
      const isReposted = targetPost.repostedBy?.includes(userId)
      const newRepostedBy = isReposted
        ? (targetPost.repostedBy || []).filter((id) => id !== userId)
        : [...(targetPost.repostedBy || []), userId]

      const update = {
        repostedBy: newRepostedBy,
        repostsCount: newRepostedBy.length,
      }

      if (isRepost) {
        updatedPost = { ...post, repostedFrom: { ...targetPost, ...update } }
      } else {
        updatedPost = { ...post, ...update }
      }
    }

    // 2. RECURSIVE CHECK: Handle the firstChildReply
    if (updatedPost.firstChildReply) {
      const updatedChild = handlePost(updatedPost.firstChildReply)
      if (updatedChild !== updatedPost.firstChildReply) {
        updatedPost = { ...updatedPost, firstChildReply: updatedChild }
      }
    }

    return updatedPost
  }

  // Logic for Pages, Thread, and Single Post remains the same but uses the new handlePost
  if (oldData.pages) {
    return {
      ...oldData,
      pages: oldData.pages.map((p) => ({
        ...p,
        posts: p.posts?.map(handlePost),
        replies: p.replies?.map(handlePost),
      })),
    }
  }
  if (oldData.ancestors || oldData.post) {
    return {
      ...oldData,
      post: oldData.post ? handlePost(oldData.post) : null,
      ancestors: oldData.ancestors?.map(handlePost),
    }
  }
  if (oldData._id) return handlePost(oldData)
  if (Array.isArray(oldData)) return oldData.map(handlePost)
  return oldData
}

export const updatePostBookmarkStatus = (oldData, postId, userId) => {
  if (!oldData) return oldData

  const handlePost = (post) => {
    if (!post) return post

    const isRepost = post.repostedFrom?._id === postId
    const targetPost = isRepost ? post.repostedFrom : post

    let updatedPost = { ...post }

    if (targetPost._id === postId) {
      const isBookmarked = targetPost.bookmarkedBy?.includes(userId)
      const newBookmarkedBy = isBookmarked
        ? (targetPost.bookmarkedBy || []).filter((id) => id !== userId)
        : [...(targetPost.bookmarkedBy || []), userId]

      if (isRepost) {
        updatedPost = { ...post, repostedFrom: { ...targetPost, bookmarkedBy: newBookmarkedBy } }
      } else {
        updatedPost = { ...post, bookmarkedBy: newBookmarkedBy }
      }
    }

    // 2. RECURSIVE CHECK: Handle the firstChildReply
    if (updatedPost.firstChildReply) {
      const updatedChild = handlePost(updatedPost.firstChildReply)
      if (updatedChild !== updatedPost.firstChildReply) {
        updatedPost = { ...updatedPost, firstChildReply: updatedChild }
      }
    }

    return updatedPost
  }

  if (oldData.pages) {
    return {
      ...oldData,
      pages: oldData.pages.map((p) => ({
        ...p,
        posts: p.posts?.map(handlePost),
        replies: p.replies?.map(handlePost),
      })),
    }
  }
  if (oldData.ancestors || oldData.post) {
    return {
      ...oldData,
      post: oldData.post ? handlePost(oldData.post) : null,
      ancestors: oldData.ancestors?.map(handlePost),
    }
  }
  if (oldData._id) return handlePost(oldData)
  if (Array.isArray(oldData)) return oldData.map(handlePost)
  return oldData
}

export const applyOptimisticPostUpdate = async (queryClient, updater) => {
  // Cancel all post-related in-flight queries
  await Promise.all(POST_NAMESPACES.map((ns) => queryClient.cancelQueries({ queryKey: [ns] })))

  const allQueries = queryClient.getQueryCache().getAll()
  const previousData = {}

  allQueries.forEach((query) => {
    const key = query.queryKey
    if (!Array.isArray(key)) return
    if (!POST_NAMESPACES.includes(key[0])) return

    previousData[JSON.stringify(key)] = queryClient.getQueryData(key)
    queryClient.setQueryData(key, (old) => updater(old))
  })

  return previousData
}

export const rollback = (queryClient, previousData) => {
  Object.entries(previousData).forEach(([key, value]) => {
    queryClient.setQueryData(JSON.parse(key), value)
  })
}

export const makeUniversalPostUpdater = (transformFn) => {
  return function updater(old) {
    if (!old) return old

    // ── infinite query ───────────────────────────────────────────────────
    if (old.pages) {
      return {
        ...old,
        pages: old.pages.map((page) => {
          // hashtag shape: { posts: [], hasNextPage, nextCursor }
          if (!Array.isArray(page) && Array.isArray(page.posts)) {
            return { ...page, posts: transformFn(page.posts) }
          }
          // reply-list shape: { replies: [], … }
          if (!Array.isArray(page) && Array.isArray(page.replies)) {
            return { ...page, replies: transformFn(page.replies) }
          }
          // flat array shape
          if (Array.isArray(page)) return transformFn(page)
          return page
        }),
      }
    }

    // ── flat array ───────────────────────────────────────────────────────
    if (Array.isArray(old)) return transformFn(old)

    // ── thread shape { post, ancestors } ────────────────────────────────
    if (old.post || old.ancestors) {
      return {
        ...old,
        post: old.post ? transformFn([old.post])[0] : old.post,
        ancestors: old.ancestors ? transformFn(old.ancestors) : old.ancestors,
      }
    }

    // ── single post detail ───────────────────────────────────────────────
    if (old._id) return transformFn([old])[0]

    return old
  }
}
