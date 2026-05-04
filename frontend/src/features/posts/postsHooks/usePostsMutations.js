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
import { hashtagKeys } from "../../hashtag/hashtagKeys"
import { applyOptimisticPostUpdate, makeUniversalPostUpdater, rollback, updatePostBookmarkStatus, updatePostLikes, updatePostPinStatus, updatePostRepostStatus } from "./postHelpers"

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
        queryClient.invalidateQueries({ queryKey: hashtagKeys.trending() })
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
      queryClient.invalidateQueries({ queryKey: hashtagKeys.trending() })
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

// ─────────────────────────────────────────────────────────────────────────────
// The three mutations – only onMutate changes; everything else is identical
// to the originals.
// ─────────────────────────────────────────────────────────────────────────────

export const useLikePost = (username = null) => {
  const queryClient = useQueryClient()
  const { authUser } = useAuthUser()

  const { mutate: likePost, isPending: isLiking } = useMutation({
    mutationFn: (postId) => likePostApi(postId),

    onMutate: async (postId) => {
      const previousData = await applyOptimisticPostUpdate(queryClient, (old) =>
        updatePostLikes(old, postId, authUser._id),
      )
      return { previousData }
    },

    onError: (error, _postId, context) => {
      showAppToast(error.message || "Failed to like/unlike post.", "error")
      if (context?.previousData) rollback(queryClient, context.previousData)
    },
  })

  return { likePost, isLiking }
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
      if (!response.ok) throw new Error(data.error || "Failed to toggle repost status")
      return data
    },

    onMutate: async (postId) => {
      const previousData = await applyOptimisticPostUpdate(queryClient, (old) =>
        updatePostRepostStatus(old, postId, authUser._id),
      )
      return { previousData }
    },

    onError: (err, _postId, context) => {
      showAppToast(err.message || "Could not update repost.", "error")
      if (context?.previousData) rollback(queryClient, context.previousData)
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
      const previousData = await applyOptimisticPostUpdate(queryClient, (old) =>
        updatePostBookmarkStatus(old, postId, authUser._id),
      )
      return { previousData }
    },

    onSuccess: (data) => {
      showAppToast(data.message, "success")
    },

    onError: (error, _postId, context) => {
      showAppToast(error.message || "Failed to toggle bookmark", "error")
      if (context?.previousData) rollback(queryClient, context.previousData)
    },
  })

  return { toggleBookmark, isBookmarking }
}

// ─── useUpdatePost ─────────────────────────────────────────────────────────────

export const useUpdatePost = () => {
  const queryClient = useQueryClient()

  const { mutate: updatePost, isPending: isUpdatingPost } = useMutation({
    mutationFn: editPostApi,

    onMutate: async ({ postId, postData }) => {
      // Transform function: patch any post whose _id matches
      const patchPost = (posts) =>
        posts.map((post) => (post._id === postId ? { ...post, ...postData, isEdited: true } : post))

      const previousData = await applyOptimisticPostUpdate(
        queryClient,
        makeUniversalPostUpdater(patchPost),
      )

      // Also snapshot + patch the single-post detail key directly
      // (applyOptimisticPostUpdate already covers it if it's under "posts",
      //  but be explicit here so the onSettled invalidation has something to
      //  compare against)
      const detailKey = postKeys.details(postId)
      const previousDetail = queryClient.getQueryData(detailKey)
      if (previousDetail && !previousData[JSON.stringify(detailKey)]) {
        previousData[JSON.stringify(detailKey)] = previousDetail
        queryClient.setQueryData(detailKey, (old) =>
          old ? { ...old, ...postData, isEdited: true } : old,
        )
      }

      return { previousData }
    },

    onError: (err, _variables, context) => {
      if (context?.previousData) rollback(queryClient, context.previousData)
      showAppToast(err.message || "Failed to edit post. Please try again.", "error")
    },

    onSuccess: (updatedPost) => {
      if (updatedPost?._id) {
        queryClient.setQueryData(postKeys.details(updatedPost._id), updatedPost)
      }
      showAppToast("Post edited successfully", "success")
    },

    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: postKeys.details(variables.postId) })
    },
  })

  return { updatePost, isUpdatingPost }
}

// ─── useVoteOnPoll ─────────────────────────────────────────────────────────────

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
      // Patch function: toggle the voter into the chosen option
      const patchVote = (posts) =>
        posts.map((post) => {
          if (post._id !== postId) return post
          const newPollOptions = post.pollOptions.map((option) =>
            option._id === optionId
              ? { ...option, voters: [...option.voters, currentUser._id] }
              : option,
          )
          return { ...post, pollOptions: newPollOptions, pollTotalVotes: post.pollTotalVotes + 1 }
        })

      const previousData = await applyOptimisticPostUpdate(
        queryClient,
        makeUniversalPostUpdater(patchVote),
      )

      return { previousData }
    },

    onError: (err, _variables, context) => {
      showAppToast(err.message || "Failed to cast vote.", "error")
      if (context?.previousData) rollback(queryClient, context.previousData)
    },
  })

  return { voteOnPoll, isVoting, isError, error }
}

export const useUpdateScheduledPost = () => {
  const queryClient = useQueryClient()

  const {
    mutate: updateScheduledPost,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: ({ postId, postData }) => updateScheduledPostApi({ postId, postData }),
    onSuccess: () => {
      showAppToast("Scheduled post updated successfully", "success")
      queryClient.invalidateQueries({ queryKey: postKeys.list("scheduled") })
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to update scheduled post", "error")
    },
  })

  return { updateScheduledPost, isPending, isError, error }
}

export const useMarkVentPostsAsRead = () => {
  const { mutate: markVentFeedAsRead } = useMutation({
    mutationFn: markVentPostsAsReadApi,
  })

  return { markVentFeedAsRead }
}

export const useMarkPostsAsRead = () => {
  const { mutate: markFeedAsRead } = useMutation({
    mutationFn: markPostsAsReadApi,
  })

  return { markFeedAsRead }
}

export const useMarkICPostsAsRead = () => {
  const { mutate: markICPostsAsRead } = useMutation({
    mutationFn: markICPostsAsReadApi,
  })

  return { markICPostsAsRead }
}
