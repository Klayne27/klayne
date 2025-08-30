import { useMutation } from "@tanstack/react-query"
import { markVentPostsAsReadApi } from "../../../api/postsApi"

export const useMarkVentPostsAsRead = () => {
  const { mutate: markVentFeedAsRead } = useMutation({
    mutationFn: markVentPostsAsReadApi,
  })

  return { markVentFeedAsRead }
}
