import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { getBoardCommentsApi, getBoardPostApi, getBoardPostsApi } from "../../../api/boardApi"
import { boardKeys } from "./boardKeys"

export const useGetBoardPosts = () => {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfiniteQuery({
      queryKey: boardKeys.list(),
      queryFn: getBoardPostsApi,
      // allPages.length is the number of pages already fetched,
      // so the next page is always allPages.length + 1
      getNextPageParam: (lastPage) => lastPage.nextPage,
      initialPageParam: 1,
    })

  const posts = data?.pages.flatMap((page) => page.posts) ?? []
  return { posts, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch }
}

export const useGetBoardPost = (id) => {
  const { data: post, isLoading } = useQuery({
    queryKey: boardKeys.detail(id),
    queryFn: () => getBoardPostApi(id),
    enabled: !!id,
  })
  return { post, isLoading }
}

export const useGetBoardComments = (boardPostId) => {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: boardKeys.comments(boardPostId),
    queryFn: getBoardCommentsApi,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage ? lastPage.nextPage : undefined),
    initialPageParam: 1,
    enabled: !!boardPostId,
  })

  const comments = data?.pages.flatMap((p) => p.comments) ?? []
  return { comments, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage }
}
