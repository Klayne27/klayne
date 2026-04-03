import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { devlogKeys } from "./devlogKeys"
import { getDevlogApi, getDevlogCommentsApi, getDevlogsApi } from "../../../api/devlogApi"

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

export const useGetDevlog = (id) => {
  return useQuery({
    queryKey: devlogKeys.detail(id),
    queryFn: () => getDevlogApi(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export const useGetDevlogComments = (devlogId) => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useInfiniteQuery({
      queryKey: devlogKeys.comments(devlogId),
      queryFn: ({ pageParam = 1 }) => getDevlogCommentsApi(devlogId, pageParam, 20),
      initialPageParam: 1,
      getNextPageParam: (lastPage, allPages) =>
        lastPage?.hasNextPage ? allPages.length + 1 : undefined,
      enabled: !!devlogId,
      staleTime: 2 * 60 * 1000,
    })

  const comments = data?.pages.flatMap((page) => page?.comments || []) || []
  const totalCount = data?.pages[0]?.totalCount || 0

  return {
    comments,
    totalCount,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  }
}