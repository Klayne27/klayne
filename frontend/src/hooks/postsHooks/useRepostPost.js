// src/hooks/postHooks/useRepostPost.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const useRepostPost = () => {
  const queryClient = useQueryClient();

  const {
    mutate: repostPost,
    isPending: isReposting,
    isError,
    error,
  } = useMutation({
    mutationFn: async (postId) => {
      try {
        const res = await fetch(`/api/posts/repost/${postId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to repost post");
        }
        return data;
      } catch (error) {
        console.error("Error reposting post:", error);
        throw error;
      }
    },
    onSuccess: (newRepost) => {
      toast.success("Post reposted successfully!");
      // Invalidate relevant queries to refetch posts and update the feed
      queryClient.invalidateQueries({ queryKey: ["posts"] });


      // OPTIONAL: Manually update the cache for the original post to increment its repost count
      // This is more complex and depends on how you implemented 'repostCount'
      // If you have a 'repostCount' field directly on the Post model, you could do:
      /*
            queryClient.setQueryData(["post", newRepost.repostedFrom], (oldPost) => {
                if (oldPost) {
                    return {
                        ...oldPost,
                        repostCount: (oldPost.repostCount || 0) + 1,
                    };
                }
                return oldPost;
            });
            */
    },
    onError: (error) => {
      toast.error(error.message || "Failed to repost post.");
    },
  });

  return { repostPost, isReposting, isError, error };
};
