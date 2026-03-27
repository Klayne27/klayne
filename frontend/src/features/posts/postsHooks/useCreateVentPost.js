import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createVentPostApi } from "../../../api/postsApi"
import { postKeys } from "./postKeys"
import toast from "react-hot-toast"
import { showAppToast } from "../../../utils/showAppToast"

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
      toast.error(error.message || "Failed to post. Please try again.")
    },
  })

  return { createVentPost, isCreatingVentPost }
}
