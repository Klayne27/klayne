import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import {
  getPlaylistsApi,
  getPlaylistTracksApi,
  getSpotifyStatusApi,
  getSpotifyTokenApi,
} from "../../../api/spotifyApi"
import { spotifyKeys } from "./spotifyKeys"

export const useSpotifyStatus = () => {
  const { data, isLoading } = useQuery({
    queryKey: spotifyKeys.status(),
    queryFn: getSpotifyStatusApi,
    staleTime: 5 * 60_000,
    retry: false,
  })
  return {
    isConnected: data?.connected ?? false,
    isPremium: data?.isPremium ?? false,
    displayName: data?.displayName ?? null,
    imageUrl: data?.imageUrl ?? null,
    isLoading,
  }
}

export const useSpotifyToken = (enabled = true) => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: spotifyKeys.token(),
    queryFn: getSpotifyTokenApi,
    enabled,
    staleTime: 2 * 60_000, // re-check every 2 min; backend refreshes within 3-min buffer
    gcTime: 3 * 60_000,
    retry: false,
  })
  return {
    token: data?.accessToken ?? null,
    expiresAt: data?.expiresAt ?? null,
    isLoading,
    isError,
    error,
    refetchToken: refetch,
  }
}

export const useSpotifyPlaylists = (token) => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: spotifyKeys.playlists(),
    queryFn: () => getPlaylistsApi(token),
    enabled: !!token,
    staleTime: 5 * 60_000,
    retry: 1,
  })
  return { playlists: data?.items ?? [], total: data?.total ?? 0, isLoading, isError, error }
}

export const useSpotifyTracks = (token, playlistId) => {
  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: spotifyKeys.tracks(playlistId),
      queryFn: ({ pageParam = 0 }) => getPlaylistTracksApi(token, playlistId, pageParam),
      initialPageParam: 0,
      getNextPageParam: (lastPage) => {
        const nextOffset = (lastPage?.offset ?? 0) + (lastPage?.limit ?? 50)
        return lastPage?.next ? nextOffset : undefined
      },
      enabled: !!token && !!playlistId,
      staleTime: 5 * 60_000,
      retry: 1,
    })
  // Strip null/unplayable tracks
  const tracks = (data?.pages ?? [])
    .flatMap((page) => page?.items ?? [])
    .map((i) => i?.track)
    .filter((t) => t?.id && t?.uri)
  return {
    tracks,
    total: data?.pages?.[0]?.total ?? 0,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  }
}
