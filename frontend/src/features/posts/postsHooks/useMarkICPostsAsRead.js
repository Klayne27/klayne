import { useMutation } from "@tanstack/react-query"
import { markICPostsAsReadApi } from "../../../api/postsApi"

export const useMarkICPostsAsRead = () => {
  const { mutate: markICPostsAsRead } = useMutation({
    mutationFn: markICPostsAsReadApi,
  })

  return { markICPostsAsRead }
}
