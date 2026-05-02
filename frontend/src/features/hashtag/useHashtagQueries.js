import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { hashtagKeys } from "./hashtagKeys"

const fetchTrending = async () => {
  const res = await fetch("/api/hashtags/trending", { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch trending hashtags")
  return res.json()
}

export const useGetTrendingHashtags = () => {
  return useQuery({
    queryKey: hashtagKeys.trending(),
    queryFn: fetchTrending,
    staleTime: 2 * 60 * 1000, // 2 min — trending changes slowly
    refetchOnWindowFocus: false,
  })
}

const fetchHashtagPosts = async ({ pageParam, queryKey }) => {
  const tag = queryKey[2]
  const url = new URL(`/api/hashtags/${tag}/posts`, window.location.origin)
  if (pageParam) url.searchParams.set("cursor", pageParam)
  const res = await fetch(url.toString(), { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch hashtag posts")
  return res.json()
}

export const useGetHashtagPosts = (tag) => {
  return useInfiniteQuery({
    queryKey: hashtagKeys.posts(tag),
    queryFn: fetchHashtagPosts,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!tag,
    staleTime: 60 * 1000,
  })
}
