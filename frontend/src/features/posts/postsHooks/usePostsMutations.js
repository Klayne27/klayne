import { useMutation, useQueryClient } from "@tanstack/react-query"
import { postKeys } from "./postKeys"
import {
  createPostApi,
  createReplyApi,
  createVentPostApi,
  deleteMultipleScheduledPostsApi,
  deletePostApi,
  editPostApi,
  likePostApi,
  markICPostsAsReadApi,
  markPostsAsReadApi,
  markVentPostsAsReadApi,
  pinUnpinPostApi,
  toggleBookmarkApi,
  unpinPostApi,
  updateScheduledPostApi,
  voteOnPollApi,
} from "../../../api/postsApi"
import { showAppToast } from "../../../utils/showAppToast"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { userKeys } from "../../users/usersHooks/userKeys"

const updatePostLikes = (oldData, postId, userId) => {
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

const updatePostPinStatus = (oldData, postId, action) => {
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

const updatePostRepostStatus = (oldData, postId, userId) => {
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

const updatePostBookmarkStatus = (oldData, postId, userId) => {
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

export const useCreatePosts = () => {
  const queryClient = useQueryClient()

  const {
    mutate: createPost,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: (newPostData) => createPostApi(newPostData),
    onSuccess: (data) => {
      if (data.isScheduled) {
        showAppToast(`Post scheduled for ${new Date(data.scheduledAt).toLocaleString()}`, "success")
        queryClient.invalidateQueries({ queryKey: postKeys.list("scheduled") })
      } else {
        showAppToast("Post created successfully", "success")
        queryClient.invalidateQueries({ queryKey: postKeys.list("/api/posts/all") })
        queryClient.invalidateQueries({ queryKey: postKeys.list("/api/posts/ic") })
        queryClient.invalidateQueries({ queryKey: postKeys.list("/api/posts/following") })
      }
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to create post", "error")
    },
  })

  return { createPost, isPending, isError, error }
}

export const useCreateReply = (parentId) => {
  const queryClient = useQueryClient()

  const { mutateAsync: createReply, isPending: isCreatingReply } = useMutation({
    mutationFn: (payload) => createReplyApi({ parentId, ...payload }),
    onSuccess: () => {
      // Invalidate the replies list for this post so it refetches
      queryClient.invalidateQueries({ queryKey: postKeys.details(parentId) })
      queryClient.invalidateQueries({ queryKey: postKeys.replies(parentId) })
      // Also invalidate the post itself so repliesCount updates
      queryClient.invalidateQueries({ queryKey: postKeys.thread(parentId) })
      showAppToast("Reply posted!", "success")
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to post reply", "error")
    },
  })

  return { createReply, isCreatingReply }
}

export const useCreateVentPost = () => {
  const queryClient = useQueryClient()

  const { mutate: createVentPost, isPending: isCreatingVentPost } = useMutation({
    mutationFn: (newPostData) => createVentPostApi(newPostData),
    onSuccess: (data) => {
      // The `data` here is the response from the API
      // Use the `isAnonymous` field from the server's response
      const isAnonymous = data.isAnonymous
      const message = isAnonymous
        ? "Your rant has been posted anonymously."
        : "Your rant has been posted successfully."

      showAppToast(message, "success")

      // Invalidate the vent posts query to refetch the data
      queryClient.invalidateQueries({ queryKey: postKeys.list("/api/posts/vent") })
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to post. Please try again.", "error")
    },
  })

  return { createVentPost, isCreatingVentPost }
}

export const useDeletePosts = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const { mutate: deletePost, isPending: isDeleting } = useMutation({
    mutationFn: (postId) => deletePostApi(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: postKeys.all })

      const previousPosts = queryClient.getQueryData(postKeys.all)

      queryClient.setQueriesData({ queryKey: postKeys.all }, (oldData) => {
        if (!oldData) return oldData

        // Infinite query (feeds, user posts, etc.)
        if (oldData.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              posts: page.posts?.filter((p) => (p._id || p.id) !== postId),
              // Some pages might store replies at the page level too
              replies: page.replies?.filter((p) => (p._id || p.id) !== postId),
            })),
          }
        }

        // Reply list shape: { replies, hasNextPage, totalReplies }
        // This is what postKeys.replies(postId) returns
        if (oldData.replies && Array.isArray(oldData.replies)) {
          return {
            ...oldData,
            replies: oldData.replies.filter((p) => (p._id || p.id) !== postId),
            totalReplies: Math.max(0, (oldData.totalReplies ?? 0) - 1),
          }
        }

        // Bare array (e.g. bookmarks, likes)
        if (Array.isArray(oldData)) {
          return oldData.filter((p) => (p._id || p.id) !== postId)
        }

        return oldData
      })

      return { previousPosts }
    },
    onSuccess: (data, postId) => {
      showAppToast("Post deleted successfully", "success")

      queryClient.invalidateQueries({ queryKey: postKeys.all })

      if (data?.parentPostId) {
        queryClient.invalidateQueries({ queryKey: postKeys.details(data.parentPostId) })
        queryClient.invalidateQueries({ queryKey: postKeys.replies(data.parentPostId) })
      }

      if (!data.parentPostId && pathname.includes("/post/")) {
        navigate(-1)
      }
    },
    onError: () => {
      showAppToast("Failed to delete post", "error")
    },
  })

  return { deletePost, isDeleting }
}

export const useDeleteMultipleScheduledPosts = () => {
  const queryClient = useQueryClient()

  const {
    mutate: deleteMultipleScheduledPosts,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: (postIds) => deleteMultipleScheduledPostsApi(postIds),

    onMutate: async (postIdsToDelete) => {
      await queryClient.cancelQueries({ queryKey: postKeys.list("scheduled") })

      const previousScheduledPosts = queryClient.getQueryData(postKeys.list("scheduled"))

      queryClient.setQueryData(postKeys.list("scheduled"), (oldPosts) =>
        oldPosts?.filter((post) => !postIdsToDelete.includes(post._id)),
      )

      return { previousScheduledPosts }
    },

    onSuccess: (data) => {
      if (data.successfulDeletions > 0) {
        showAppToast(
          `${data.successfulDeletions} scheduled post(s) successfully removed!`,
          "success",
        )
      }
    },

    onError: (error, postIdsToDelete, context) => {
      showAppToast(error.message || "Failed to remove scheduled posts. Please try again.", "error")

      queryClient.setQueryData(postKeys.list("scheduled"), context.previousScheduledPosts)
      queryClient.invalidateQueries({ queryKey: postKeys.list("scheduled") })
    },
  })

  return { deleteMultipleScheduledPosts, isPending, isError, error }
}

export const useLikePost = (username = null) => {
  const queryClient = useQueryClient()
  const { authUser } = useAuthUser()

  const { mutate: likePost, isPending: isLiking } = useMutation({
    mutationFn: (postId) => likePostApi(postId),

    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: postKeys.all })

      // 2. Get all keys currently in the cache
      const allActiveQueries = queryClient.getQueryCache().getAll()

      const previousData = {}

      // 3. Iterate through every cached query
      allActiveQueries.forEach((query) => {
        const key = query.queryKey

        // Check if this query is a "posts" related query
        if (Array.isArray(key) && key[0] === "posts") {
          const data = queryClient.getQueryData(key)

          // Save for rollback
          previousData[JSON.stringify(key)] = data

          // 4. Perform the update
          queryClient.setQueryData(key, (oldData) => updatePostLikes(oldData, postId, authUser._id))
        }
      })

      return { previousData }
    },

    onError: (error, postId, context) => {
      showAppToast(error.message || "Failed to like/unlike post.")

      if (context?.previousData) {
        Object.entries(context.previousData).forEach(([key, value]) => {
          queryClient.setQueryData(JSON.parse(key), value)
        })
      }
    },
  })

  return { likePost, isLiking }
}

export const usePinPost = () => {
  const queryClient = useQueryClient()
  const { authUser } = useAuthUser()

  const {
    mutate: pinUnpinPost,
    isPending: isPinning,
    isError,
    error,
  } = useMutation({
    mutationFn: ({ postId, action }) => {
      if (action === "pin") {
        return pinUnpinPostApi(postId)
      }
      if (action === "unpin") {
        return unpinPostApi(postId)
      }
      throw new Error("Invalid action for pinUnpinPost")
    },

    onMutate: async ({ postId, action, post }) => {
      if (!authUser?.username) {
        console.warn("No authenticated user or username for optimistic pin update.")
        return
      }

      const optimisticPin = action === "unpin" ? postKeys.pinned(authUser.username) : ""

      const keysToUpdate = [
        optimisticPin,
        postKeys.details(postId),
        postKeys.all,
        postKeys.bookmarked(),
      ].filter((key) => queryClient.getQueryData(key) !== undefined)

      await Promise.all(keysToUpdate.map((key) => queryClient.cancelQueries({ queryKey: key })))

      const previousData = keysToUpdate.reduce((acc, key) => {
        acc[JSON.stringify(key)] = queryClient.getQueryData(key)
        return acc
      }, {})

      keysToUpdate.forEach((key) => {
        queryClient.setQueryData(key, (oldData) => updatePostPinStatus(oldData, postId, action))
      })

      const authUserKey = userKeys.auth()
      queryClient.setQueryData(authUserKey, (oldData) => {
        if (!oldData) return oldData
        const newPinnedPostsIds = oldData.pinnedPosts || []
        if (action === "pin") {
          return { ...oldData, pinnedPosts: [postId, ...newPinnedPostsIds] }
        }
        return { ...oldData, pinnedPosts: newPinnedPostsIds.filter((id) => id !== postId) }
      })
      previousData[JSON.stringify(authUserKey)] = queryClient.getQueryData(authUserKey)

      return { previousData }
    },

    onSuccess: (data) => {
      showAppToast(data.message, "success")
      queryClient.invalidateQueries({ queryKey: postKeys.list() })
      queryClient.invalidateQueries({ queryKey: postKeys.details() })
      queryClient.invalidateQueries({ queryKey: postKeys.bookmarked() })
      queryClient.invalidateQueries({ queryKey: postKeys.likes() })
    },

    onError: (error, variables, context) => {
      showAppToast(error.message || "Failed to update pin status", "error")
      if (context?.previousData) {
        Object.entries(context.previousData).forEach(([key, value]) => {
          queryClient.setQueryData(JSON.parse(key), value)
        })
      }
    },
  })

  return { pinUnpinPost, isPinning, isError, error }
}

export const useRepostPost = (username) => {
  const queryClient = useQueryClient()
  const { authUser } = useAuthUser()

  const { mutate: repostPost, isPending: isReposting } = useMutation({
    mutationFn: async (postId) => {
      const response = await fetch(`/api/posts/repost/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to toggle repost status")
      }
      return data
    },

    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: postKeys.all })
      const allQueries = queryClient.getQueryCache().getAll()
      const previousData = {}

      allQueries.forEach((query) => {
        const key = query.queryKey
        if (Array.isArray(key) && key[0] === "posts") {
          previousData[JSON.stringify(key)] = queryClient.getQueryData(key)
          queryClient.setQueryData(key, (old) => updatePostRepostStatus(old, postId, authUser._id))
        }
      })
      return { previousData }
    },

    onSuccess: (data) => {
      // showAppToast(data.message || "Success!", "success")
    },

    onError: (err, postId, context) => {
      showAppToast(err.message || "Could not update repost.", "error")
      if (context?.previousData) {
        Object.entries(context.previousData).forEach(([key, value]) => {
          queryClient.setQueryData(JSON.parse(key), value)
        })
      }
    },
  })

  return { repostPost, isReposting }
}

export const useToggleBookmarks = (currentProfileUsername = null) => {
  const queryClient = useQueryClient()
  const { authUser } = useAuthUser()

  const { mutate: toggleBookmark, isPending: isBookmarking } = useMutation({
    mutationFn: toggleBookmarkApi,

    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: postKeys.all })
      const allQueries = queryClient.getQueryCache().getAll()
      const previousData = {}

      allQueries.forEach((query) => {
        const key = query.queryKey
        if (Array.isArray(key) && key[0] === "posts") {
          previousData[JSON.stringify(key)] = queryClient.getQueryData(key)
          queryClient.setQueryData(key, (old) =>
            updatePostBookmarkStatus(old, postId, authUser._id),
          )
        }
      })
      return { previousData }
    },

    onSuccess: (data) => {
      showAppToast(data.message, "success")
    },

    onError: (error, postId, context) => {
      console.error("Error toggling bookmark:", error)
      showAppToast(error.message || "Failed to toggle bookmark", "error")

      if (context) {
        for (const snapshotKey in context) {
          queryClient.setQueryData(JSON.parse(snapshotKey), context[snapshotKey])
        }
      }
    },
  })

  return { toggleBookmark, isBookmarking }
}

export const useUpdatePost = () => {
  const queryClient = useQueryClient()

  const { mutate: updatePost, isPending: isUpdatingPost } = useMutation({
    mutationFn: editPostApi,

    onMutate: async ({ postId, postData }) => {
      await queryClient.cancelQueries({ queryKey: postKeys.details(postId) })

      const previousPost = queryClient.getQueryData(postKeys.details(postId))

      if (previousPost) {
        queryClient.setQueryData(postKeys.details(postId), (old) => ({
          ...old,
          ...postData,
        }))
      }

      queryClient.setQueriesData({ queryKey: postKeys.all }, (oldData) => {
        if (oldData.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              posts: page.posts
                ? page.posts.map((post) => (post._id === postId ? { ...post, ...postData } : post))
                : [],
            })),
          }
        }

        if (Array.isArray(oldData)) {
          return oldData.map((post) => (post._id === postId ? { ...post, ...postData } : post))
        }

        return oldData
      })

      return { previousPost }
    },

    onError: (err, variables, context) => {
      if (context?.previousPost) {
        queryClient.setQueryData(postKeys.details(variables.postId), context.previousPost)
      }
      showAppToast(err.message || "Failed to edit post. Please try again.", "error")
    },

    onSettled: (data, error, variables) => {
      // queryClient.invalidateQueries({ queryKey: postKeys.details(variables.postId) })
      // queryClient.invalidateQueries({ queryKey: ["posts", "list"] })
      // queryClient.invalidateQueries({ queryKey: ["posts", "user"] })
    },

    onSuccess: () => {
      showAppToast("Post edited successfully", "success")
    },
  })

  return { updatePost, isUpdatingPost }
}

export const useVoteOnPoll = () => {
  const queryClient = useQueryClient()
  const { authUser: currentUser } = useAuthUser()
  const { username } = useParams()

  const {
    mutate: voteOnPoll,
    isPending: isVoting,
    isError,
    error,
  } = useMutation({
    mutationFn: (variables) => voteOnPollApi(variables),

    onMutate: async ({ postId, optionId }) => {
      // Step 1: Define all possible query keys that might contain the post.
      const keysToUpdate = [
        postKeys.list("/api/posts/all"),
        postKeys.list("/api/posts/ic"),
        postKeys.list("/api/posts/vent"),
        postKeys.list("/api/posts/following"),
        postKeys.bookmarked(),
        postKeys.pinned(username),
        postKeys.details(postId),
        postKeys.user(username),
        postKeys.likes(username),
        postKeys.replies(postId),
        postKeys.thread(postId),
      ].filter((key) => queryClient.getQueryData(key))

      // Step 2: Cancel ongoing queries and capture previous state.
      await Promise.all(keysToUpdate.map((key) => queryClient.cancelQueries({ queryKey: key })))
      const previousData = keysToUpdate.reduce((acc, key) => {
        acc[JSON.stringify(key)] = queryClient.getQueryData(key)
        return acc
      }, {})

      // Helper function for the update logic to avoid repetition
      const updatePostInList = (posts) =>
        posts?.map((post) => {
          if (post._id === postId) {
            const newPollOptions = post.pollOptions.map((option) =>
              option._id === optionId
                ? { ...option, voters: [...option.voters, currentUser._id] }
                : option,
            )
            return {
              ...post,
              pollOptions: newPollOptions,
              pollTotalVotes: post.pollTotalVotes + 1,
            }
          }
          return post
        })

      // Step 3: Loop through all relevant caches and perform the optimistic update.
      keysToUpdate.forEach((key) => {
        queryClient.setQueryData(key, (oldData) => {
          if (!oldData) return oldData

          // Case 1: Handle infinite query data structure { pages: [...] }
          if (oldData.pages) {
            return {
              ...oldData,
              pages: oldData.pages.map((page) => ({
                ...page,
                posts: updatePostInList(page.posts),
              })),
            }
          }

          // Case 2: Handle simple array of posts [post1, post2, ...]
          if (Array.isArray(oldData)) {
            return updatePostInList(oldData)
          }

          // Case 3: Handle a single post object { _id: ..., ... }
          // This will cover the post details page
          if (oldData._id === postId) {
            return updatePostInList([oldData])[0] // Reuse the helper
          }

          // If the data structure is unrecognized, return it unchanged.
          return oldData
        })
      })

      return { previousData }
    },

    onError: (err, variables, context) => {
      showAppToast(err.message || "Failed to cast vote.", "error")
      // Rollback the cache on error.
      if (context?.previousData) {
        Object.entries(context.previousData).forEach(([key, value]) => {
          queryClient.setQueryData(JSON.parse(key), value)
        })
      }
    },
  })

  return { voteOnPoll, isVoting, isError, error }
}

export const useUpdateScheduledPost = () => {
  const queryClient = useQueryClient();

  const {
    mutate: updateScheduledPost,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: ({ postId, postData }) => updateScheduledPostApi({ postId, postData }),
    onSuccess: () => {
      showAppToast("Scheduled post updated successfully", "success");
      queryClient.invalidateQueries({ queryKey: postKeys.list("scheduled") });
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to update scheduled post", "error");
    },
  });

  return { updateScheduledPost, isPending, isError, error };
};

export const useMarkVentPostsAsRead = () => {
  const { mutate: markVentFeedAsRead } = useMutation({
    mutationFn: markVentPostsAsReadApi,
  })

  return { markVentFeedAsRead }
}


export const useMarkPostsAsRead = () => {
  const { mutate: markFeedAsRead } = useMutation({
    mutationFn: markPostsAsReadApi,
  });

  return { markFeedAsRead };
};

export const useMarkICPostsAsRead = () => {
  const { mutate: markICPostsAsRead } = useMutation({
    mutationFn: markICPostsAsReadApi,
  })

  return { markICPostsAsRead }
}
