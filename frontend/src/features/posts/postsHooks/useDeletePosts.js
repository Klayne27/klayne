import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useLocation, useNavigate } from "react-router-dom"
import { deletePostApi } from "../../../api/postsApi"
import { postKeys } from "./postKeys"
import { showAppToast } from "../../../utils/showAppToast"

export const useDeletePosts = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const { mutate: deletePost, isPending: isDeleting } = useMutation({
    mutationFn: (postId) => deletePostApi(postId),
    onSuccess: (_, postId) => {
      showAppToast("Post deleted successfully", "success")
      queryClient.invalidateQueries({ queryKey: postKeys.all })
      pathname.includes("/post/") ? navigate(-1) : ""
    },
    onError: () => {
      showAppToast("Failed to delete post", "error")
    },
  })

  return { deletePost, isDeleting }
}
