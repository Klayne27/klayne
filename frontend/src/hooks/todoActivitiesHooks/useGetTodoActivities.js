import { useInfiniteQuery } from "@tanstack/react-query"
import { getTodoActivityApi } from "../../api/todoActivityApi"

export const useGetTodoActivities = () => {
  const {
    data: todoActivities,
    isLoading: todoActivitiesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["todoActivityLog"],
    queryFn: getTodoActivityApi,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasNextPage) {
        return allPages.length
      }
      return undefined
    },
  })
  return { todoActivities, todoActivitiesLoading, fetchNextPage, hasNextPage, isFetchingNextPage }
}
