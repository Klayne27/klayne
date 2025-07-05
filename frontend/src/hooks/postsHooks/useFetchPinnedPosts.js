import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

export const useFetchPinnedPosts = (username) => {
  const {
    data: pinnedPosts,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["pinnedPosts", username], // Unique query key for pinned posts
    queryFn: async () => {
      try {
        const res = await fetch(`/api/posts/profile/${username}/pinned-posts`); // Use the new endpoint
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch pinned posts");
        }
        return data;
      } catch (error) {
        throw new Error(error.message);
      }
    },
    enabled: !!username, // Only run the query if username is available
    staleTime: 5 * 60 * 1000, // Keep data fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep data in cache for 10 minutes
  });

  return { pinnedPosts, isLoading, isError, error, refetch, isRefetching };
};
