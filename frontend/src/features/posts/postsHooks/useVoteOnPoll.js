import { useMutation, useQueryClient } from "@tanstack/react-query"

import { postKeys } from "./postKeys"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { voteOnPollApi } from "../../../api/postsApi"
import { showAppToast } from "../../../utils/showAppToast"

const updatePollOptimistically = (oldData, postId, optionId, userId) => {
  if (!oldData || !userId) return oldData

  const handlePost = (post) => {
    const isTarget = post._id === postId || post.repostedFrom?._id === postId
    if (!isTarget) return post

    const targetPost = post.repostedFrom?._id === postId ? post.repostedFrom : post

    const existingVotedOption = targetPost.pollOptions.find((option) =>
      option.voters.includes(userId),
    )

    let newPollTotalVotes = targetPost.pollTotalVotes || 0

    const newPollOptions = targetPost.pollOptions.map((option) => {
      if (option._id === optionId) {
        newPollTotalVotes++
        return {
          ...option,
          voters: [...option.voters, userId],
        }
      }
      return option
    })

    if (post.repostedFrom?._id === postId) {
      return {
        ...post,
        repostedFrom: {
          ...targetPost,
          pollOptions: newPollOptions,
          pollTotalVotes: newPollTotalVotes,
        },
      }
    }

    return {
      ...post,
      pollOptions: newPollOptions,
      pollTotalVotes: newPollTotalVotes,
    }
  }

  if (oldData.pages) {
    const newPages = oldData.pages.map((page) => ({
      ...page,
      posts: (page.posts || []).map(handlePost),
    }))
    return { ...oldData, pages: newPages }
  }

  if (oldData._id) {
    return handlePost(oldData)
  }

  return oldData
}

export const useVoteOnPoll = () => {
  const queryClient = useQueryClient()
  const { authUser } = useAuthUser()

  const {
    mutate: voteOnPoll,
    isPending: isVoting,
    isError,
    error,
  } = useMutation({
    mutationFn: (variables) => voteOnPollApi(variables),
    onMutate: async (variables) => {
      const { postId, optionId } = variables
      if (!authUser?._id) {
        return
      }

      const keysToUpdate = [postKeys.all, postKeys.details(postId)].filter(
        (key) => queryClient.getQueryData(key) !== undefined,
      )

      await Promise.all(keysToUpdate.map((key) => queryClient.cancelQueries({ queryKey: key })))

      const previousData = keysToUpdate.reduce((acc, key) => {
        acc[JSON.stringify(key)] = queryClient.getQueryData(key)
        return acc
      }, {})

      keysToUpdate.forEach((key) => {
        queryClient.setQueryData(key, (oldData) =>
          updatePollOptimistically(oldData, postId, optionId, authUser._id),
        )
      })

      return { previousData }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.all })
    },

    onError: (err, variables, context) => {
      showAppToast(err.message || "Failed to cast vote.", "error")

      if (context?.previousData) {
        Object.entries(context.previousData).forEach(([key, value]) => {
          queryClient.setQueryData(JSON.parse(key), value)
        })
      }
    },
  })

  return { voteOnPoll, isVoting, isError, error }
}
