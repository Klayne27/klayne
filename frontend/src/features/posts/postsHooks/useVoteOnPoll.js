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
      ].filter((key) => queryClient.getQueryData(key)) // Filter out keys that don't have cached data.

      // Step 2: Cancel ongoing queries and capture the previous state for rollback.
      await Promise.all(keysToUpdate.map((key) => queryClient.cancelQueries({ queryKey: key })))
      const previousData = keysToUpdate.reduce((acc, key) => {
        acc[JSON.stringify(key)] = queryClient.getQueryData(key)
        return acc
      }, {})

      // Step 3: Loop through all relevant caches and perform the optimistic update.
      keysToUpdate.forEach((key) => {
        queryClient.setQueryData(key, (oldData) => {
          console.log(key);
          // Handle the case where the data is a single post object (details query).
          if (key[1] === "details") {
            const hasVoted = oldData.pollOptions.some((option) =>
              option.voters.includes(currentUser._id),
            )
            if (hasVoted) return oldData // User has already voted, no update needed.

            const newPollOptions = oldData.pollOptions.map((option) =>
              option._id === optionId
                ? { ...option, voters: [...option.voters, currentUser._id] }
                : option,
            )
            return {
              ...oldData,
              pollOptions: newPollOptions,
              pollTotalVotes: oldData.pollTotalVotes + 1,
            }
          }

          // Handle the case where the data is an infinite list (e.g., feed, user posts).
          if (!oldData || !oldData.pages) return oldData
console.log('oldData', oldData);
          const newPages = oldData.pages.map((page) => {
            const updatedPosts = page.posts?.map((post) => {
              if (post._id === postId) {
                const hasVoted = post.pollOptions.some((option) =>
                  option.voters.includes(currentUser._id),
                )
                if (hasVoted) return post // User has already voted, no update needed.

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
            return { ...page, posts: updatedPosts }
          })
          return { ...oldData, pages: newPages }
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
