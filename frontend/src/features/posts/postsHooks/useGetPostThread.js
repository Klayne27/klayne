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
    staleTime: 5 * 60 * 1000,
    initialData: () => {
      // Use the query cache to find this post anywhere (Feed, Search, other threads)
      const allQueries = queryClient.getQueryCache().findAll()

      for (const query of allQueries) {
        const d = query.state.data
        // Search in infinite pages (feeds/replies)
        if (d?.pages) {
          for (const page of d.pages) {
            const found =
              page.posts?.find((p) => p._id === postId) ||
              page.replies?.find((r) => r._id === postId)
            if (found) return { post: found, ancestors: [] }
          }
        }
        // Search in other thread objects
        if (d?.post?._id === postId) return { post: d.post, ancestors: [] }
      }
      return undefined
    },
  })

  return {
    post: data?.post ?? null,
    ancestors: data?.ancestors ?? [],
    // This is the key: Only loading if we have NO data at all
    isLoading: !data && isLoading,
    isError,
  }
}