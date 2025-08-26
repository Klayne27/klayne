import { useMutation, useQueryClient } from "@tanstack/react-query"
import { postKeys } from "./postKeys"
import { voteOnPollApi } from "../../../api/postsApi"
import { showAppToast } from "../../../utils/showAppToast"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"

export const useVoteOnPoll = () => {
  const queryClient = useQueryClient()
  const { authUser: currentUser } = useAuthUser() // Correctly get the current user

  const {
    mutate: voteOnPoll,
    isPending: isVoting,
    isError,
    error,
  } = useMutation({
    mutationFn: (variables) => voteOnPollApi(variables),

    onMutate: async ({ postId, optionId }) => {
      // Cancel any ongoing refetches to avoid conflicts with the optimistic update
      await queryClient.cancelQueries({ queryKey: postKeys.all })

      // Get a snapshot of the current query data to enable rollback on error
      const previousQueries = queryClient.getQueriesData({ queryKey: postKeys.all })

      // Optimistically update the single post details query cache
      const singlePostQueryKey = postKeys.details(postId)
      queryClient.setQueryData(singlePostQueryKey, (oldPost) => {
        if (!oldPost) return oldPost

        const hasVoted = oldPost.pollOptions.some(
          (option) => option.voters.includes(currentUser._id), // <-- FIX: Use currentUser._id
        )

        if (hasVoted) {
          return oldPost // The user has already voted, so no optimistic update is needed
        }

        const newPollOptions = oldPost.pollOptions.map((option) =>
          option._id === optionId
            ? { ...option, voters: [...option.voters, currentUser._id] } // <-- FIX: Use currentUser._id
            : option,
        )

        return {
          ...oldPost,
          pollOptions: newPollOptions,
          pollTotalVotes: oldPost.pollTotalVotes + 1,
        }
      })

      // Optimistically update all relevant infinite list queries
      queryClient.setQueriesData({ queryKey: postKeys.all }, (oldData) => {
        if (!oldData || !oldData.pages) return oldData
        console.log("oldData all posts", oldData)

        const newPages = oldData.pages.map((page) => {
          const updatedPosts = page.posts?.map((post) => {
            if (post._id === postId) {
              // Note: The `post.user._id` here is for the post author.
              // We need to check if the currentUser has voted.
              const hasVoted = post.pollOptions.some(
                (option) => option.voters.includes(currentUser._id), // <-- FIX: Use currentUser._id
              )

              if (hasVoted) return post

              const newPollOptions = post.pollOptions.map((option) =>
                option._id === optionId
                  ? { ...option, voters: [...option.voters, currentUser._id] } // <-- FIX: Use currentUser._id
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

      return { previousQueries }
    },

    onError: (err, variables, context) => {
      showAppToast(err.message || "Failed to cast vote.", "error")
      // Rollback the cache to its previous state on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, value]) => {
          queryClient.setQueryData(key, value)
        })
      }
    },

    onSettled: (data, error, variables) => {
      // Invalidate queries to re-fetch the correct data from the server
      queryClient.invalidateQueries({ queryKey: postKeys.details(variables.postId) })
      queryClient.invalidateQueries({ queryKey: postKeys.all })
    },
  })

  return { voteOnPoll, isVoting, isError, error }
}
