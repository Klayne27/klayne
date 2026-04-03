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
      const allQueries = queryClient.getQueryCache().findAll()

      for (const query of allQueries) {
        const d = query.state.data

        if (d?.pages) {
          for (const page of d.pages) {
            const found =
              page.posts?.find((p) => p._id === postId) ||
              page.replies?.find((r) => r._id === postId)

            if (found) {
              // Only use as initialData if the post has no parent —
              // if it's a reply, ancestors would be wrong so skip it
              // and let the API fetch the correct thread
              if (!found.parentPost) {
                return { post: found, ancestors: [] }
              }
              return undefined
            }
          }
        }

        if (d?.post?._id === postId) return { post: d.post, ancestors: d.ancestors ?? [] }
      }
      return undefined
    },
  })

  return {
    post: data?.post ?? null,
    ancestors: data?.ancestors ?? [],
    isLoading: !data && isLoading,
    isError,
  }
}
