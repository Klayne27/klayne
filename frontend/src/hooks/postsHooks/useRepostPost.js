// In hooks/postsHooks/useRepostPost.js (consider renaming this file to useToggleRepost or similar)

import { useQueryClient, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const useRepostPost = () => {
  // Or useToggleRepost
  const queryClient = useQueryClient();

  const {
    mutate: repostPost, // Renamed for clarity
    isPending: isReposting,
  } = useMutation({
    mutationFn: async (originalPostId) => {
      const response = await fetch(`/api/posts/repost/${originalPostId}`, {
        method: "POST", // Always POST to the toggle endpoint
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to toggle repost status");
      }
      return data; // This data will contain { message, newRepostsCount, hasUserReposted }
    },
    onSuccess: (data, originalPostId) => {
      toast.success(data.message);

      // Invalidate queries to refetch posts (all relevant lists and the specific post)
      queryClient.invalidateQueries({ queryKey: ["posts"] }); // For the main feed
      queryClient.invalidateQueries({ queryKey: ["post", originalPostId] }); // If fetching individual post details

      // Since the backend now returns `hasUserReposted` and `newRepostsCount`,
      // you can use `queryClient.setQueryData` for a more precise optimistic update,
      // but invalidating is safer if there are many places to update.
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return { repostPost, isReposting };
};
