import { useQuery, useQueryClient } from "@tanstack/react-query"
import { postKeys } from "./postKeys"
import { getPostApi } from "../../../api/postsApi"

export const useGetPost = (pid) => {
  const queryClient = useQueryClient()

  const {
    data: post,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: postKeys.details(pid),
    queryFn: () => getPostApi(pid),
    enabled: !!pid,
    staleTime: 15 * 60 * 1000,

    // --- THIS IS THE MAGIC ---
    initialData: () => {
      // 1. Try to find the post in the "all posts" feeds
      const allPostsData = queryClient.getQueryCache().findAll({
        queryKey: ["posts"], // This matches your postKeys.all
      })

      for (const query of allPostsData) {
        const data = query.state.data

        // Search in infinite query pages
        if (data?.pages) {
          for (const page of data.pages) {
            const found =
              page.posts?.find((p) => p._id === pid) ||
              page.replies?.find((r) => r._id === pid) ||
              page.replies?.find((r) => r.firstChildReply?._id === pid)?.firstChildReply
            if (found) return found
          }
        }

        // Search in single post thread caches (ancestors/hero)
        if (data?.post?._id === pid) return data.post
        if (data?.ancestors) {
          const found = data.ancestors.find((a) => a._id === pid)
          if (found) return found
        }
      }
      return undefined
    },
    initialDataUpdatedAt: () => queryClient.getQueryState(postKeys.details(pid))?.dataUpdatedAt,
  })

  return { post, isLoading, isError, error, refetch }
}
