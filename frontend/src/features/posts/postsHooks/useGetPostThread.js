// useGetPostThread.js
import { useQuery } from "@tanstack/react-query"
import { getPostThreadApi } from "../../../api/postsApi"
import { postKeys } from "./postKeys"

export const useGetPostThread = (postId) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: postKeys.thread(postId),
    queryFn: () => getPostThreadApi(postId),
    enabled: !!postId,
  })

  return {
    post: data?.post ?? null,
    ancestors: data?.ancestors ?? [],
    isLoading,
    isError,
  }
}
