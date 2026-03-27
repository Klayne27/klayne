import { useMutation, useQueryClient } from "@tanstack/react-query"
import { editPostApi } from "../../../api/postsApi"
import { showAppToast } from "../../../utils/showAppToast"
import { postKeys } from "./postKeys"

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
