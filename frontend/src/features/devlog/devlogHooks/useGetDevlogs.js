import { useInfiniteQuery } from "@tanstack/react-query"
import { devlogKeys } from "./devlogKeys"
import { getDevlogsApi } from "../../../api/devlogApi"

export const useGetDevlogs = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    refetch,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: devlogKeys.list(),
    queryFn: ({ pageParam = 1 }) => getDevlogsApi(pageParam, 10),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage?.hasNextPage ? allPages.length + 1 : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const devlogs = data?.pages.flatMap((page) => page?.devlogs || []) || []
  const totalCount = data?.pages[0]?.totalCount || 0

  return {
    devlogs,
    totalCount,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isError,
    error,
  }
}
