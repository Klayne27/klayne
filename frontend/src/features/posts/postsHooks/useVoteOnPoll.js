import { useMutation, useQueryClient } from "@tanstack/react-query"
import { postKeys } from "./postKeys"
import { voteOnPollApi } from "../../../api/postsApi"
import { showAppToast } from "../../../utils/showAppToast"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { useParams } from "react-router-dom"

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
        postKeys.list("/api/posts/following"),
        postKeys.bookmarked(),
        postKeys.pinned(username),
        postKeys.details(postId),
        postKeys.user(username),
        postKeys.likes(username),
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
