import { useMutation, useQueryClient } from "@tanstack/react-query"
import { editPostApi } from "../../../api/postsApi"
import { showAppToast } from "../../../utils/showAppToast"
import { postKeys } from "./postKeys"

export const useEditPost = () => {
  const queryClient = useQueryClient()

  const { mutate: editPost, isPending: isEditingPost } = useMutation({
    mutationFn: editPostApi,
    onSuccess: (data) => {
        console.log(data);

      // Optionally, you can also update the specific post in the cache for a more performant update
      queryClient.invalidateQueries(postKeys.details(data._id))

      showAppToast("Post edited successfully", "success")
    },
    onError: (error) => {
      showAppToast(error.message, "error")
    },
  })

  return { editPost, isEditingPost }
}
