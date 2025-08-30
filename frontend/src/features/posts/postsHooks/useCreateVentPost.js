// hooks/posts/useCreateVentPost.js

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createVentPostApi } from "../../../api/postsApi"
import { postKeys } from "./postKeys"
import toast from "react-hot-toast"

export const useCreateVentPost = () => {
  const queryClient = useQueryClient()

  const { mutate: createVentPost, isPending: isCreatingVentPost } = useMutation({
    mutationFn: (newPostData) => createVentPostApi(newPostData),
    onSuccess: () => {
      toast.success("Your vent has been posted anonymously.")
      // Invalidate the vent feed query to refetch and show the new post
      queryClient.invalidateQueries({ queryKey: postKeys.list("/api/posts/vent") })
    },
    onError: (error) => {
      toast.error(error.message || "Failed to post. Please try again.")
    },
  })

  return { createVentPost, isCreatingVentPost }
}
