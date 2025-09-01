
import { useQuery } from "@tanstack/react-query"
import { getPostHistoryApi } from "../../../api/postsApi"

export const useGetPostHistory = (postId) => {
  const {
    data: history,
    isLoading: isLoadingHistory,
    isError: isHistoryError,
    error: historyError,
  } = useQuery({
    queryKey: ["postHistory", postId],
    queryFn: () => getPostHistoryApi(postId),
    enabled: !!postId, // Only run the query if a postId is provided
  })

  return { history, isLoadingHistory, isHistoryError, historyError }
}
