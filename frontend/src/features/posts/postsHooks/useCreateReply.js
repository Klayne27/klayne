import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createReplyApi } from "../../../api/postsApi"
import { showAppToast } from "../../../utils/showAppToast"
import { postKeys } from "./postKeys"

export const useCreateReply = (parentId) => {
  const queryClient = useQueryClient()

  const { mutateAsync: createReply, isPending: isCreatingReply } = useMutation({
    mutationFn: (payload) => createReplyApi({ parentId, ...payload }),
    onSuccess: () => {
      // Invalidate the replies list for this post so it refetches
      queryClient.invalidateQueries({ queryKey: postKeys.details(parentId) })
      queryClient.invalidateQueries({ queryKey: postKeys.replies(parentId) })
      // Also invalidate the post itself so repliesCount updates
      queryClient.invalidateQueries({ queryKey: postKeys.thread(parentId) })
      showAppToast("Reply posted!", "success")
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to post reply", "error")
    },
  })

  return { createReply, isCreatingReply }
}
