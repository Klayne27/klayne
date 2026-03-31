// useGetPostThread.js
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getPostThreadApi } from "../../../api/postsApi"
import { postKeys } from "./postKeys"

export const useGetPostThread = (postId) => {
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: postKeys.thread(postId),
    queryFn: () => getPostThreadApi(postId),
    enabled: !!postId,
    // Use initialData to show the post immediately, even if ancestors aren't known yet
    initialData: () => {
      const existingPost = queryClient.getQueryData(postKeys.details(postId))
      if (existingPost) {
        return { post: existingPost, ancestors: [] }
      }
    },
  })

  return {
    post: data?.post ?? null,
    ancestors: data?.ancestors ?? [],
    isLoading: !data && isLoading, // Only show spinner if we have NO initial data
    isError,
  }
}