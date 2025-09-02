import { useMutation, useQueryClient } from "@tanstack/react-query"
import { editPostApi } from "../../../api/postsApi"
import { showAppToast } from "../../../utils/showAppToast"
import { postKeys } from "./postKeys"

export const useUpdatePost = () => {
  const queryClient = useQueryClient()

  const { mutate: updatePost, isPending: isUpdatingPost } = useMutation({
    mutationFn: editPostApi,

    // 1. Called before the mutation function
    onMutate: async ({ postId, postData }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: postKeys.details(postId) })

      // --- Snapshot the previous value for a single post ---
      const previousPost = queryClient.getQueryData(postKeys.details(postId))

      // --- Optimistically update the single post detail cache ---
      // This makes the change appear instantly on the post's detail page
      if (previousPost) {
        queryClient.setQueryData(postKeys.details(postId), (old) => ({
          ...old,
          ...postData,
        }))
      }

      // --- Optimistically update the post in all post lists (infinite queries) ---
      // This makes the change appear instantly on feeds (For You, Following, user profiles, etc.)
      queryClient.setQueriesData({ queryKey: postKeys.all }, (oldData) => {
        if (!oldData || !oldData.pages) return oldData

        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) =>
              post._id === postId ? { ...post, ...postData } : post,
            ),
          })),
        }
      })

      // Return a context object with the snapshotted value
      return { previousPost }
    },

    // 2. If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, variables, context) => {
      // Roll back the single post cache
      if (context?.previousPost) {
        queryClient.setQueryData(postKeys.details(variables.postId), context.previousPost)
      }
      showAppToast(err.message || "Failed to edit post. Please try again.", "error")
    },

    // 3. Always refetch after the mutation is settled (either success or error)
    onSettled: (data, error, variables) => {
      // Invalidate both the specific post and all lists to ensure fresh data from the server.
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
