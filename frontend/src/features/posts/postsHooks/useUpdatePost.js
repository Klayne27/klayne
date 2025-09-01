import { useMutation, useQueryClient } from "@tanstack/react-query"
import { editPostApi } from "../../../api/postsApi"
import { showAppToast } from "../../../utils/showAppToast"
import { postKeys } from "./postKeys"

export const useUpdatePost = () => {
  const queryClient = useQueryClient()

  const { mutate: updatePost, isPending: isUpdatingPost } = useMutation({
    mutationFn: editPostApi,
    onSuccess: (data) => {
      // Optionally, you can also update the specific post in the cache for a more performant update
      queryClient.invalidateQueries(postKeys.details(data._id))

      showAppToast("Post edited successfully", "success")
    },
    onError: (error) => {
      showAppToast(error.message, "error")
    },
  })

  return { updatePost, isUpdatingPost }
}
