import { useQueryClient, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuthUser } from "../authHooks/useAuthUser"; // Assuming this is available

export const useRepostPost = () => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser(); // Needed for optimistic updates if user is the reposter

  const { mutate: repostPost, isPending: isReposting } = useMutation({
    mutationFn: async (originalPostId) => {
      const response = await fetch(`/api/posts/repost/${originalPostId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to toggle repost status");
      }
      return data;
    },
    onMutate: async (originalPostId) => {
      if (!authUser?._id) {
        console.warn("No authenticated user ID for optimistic repost update.");
        return;
      }

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      await queryClient.cancelQueries({ queryKey: ["bookmarkedPosts"] });
      await queryClient.cancelQueries({ queryKey: ["pinnedPosts", authUser.username] });
      await queryClient.cancelQueries({ queryKey: ["post", originalPostId] });

      // Store previous data for rollback
      const previousPostsData = queryClient.getQueryData(["posts"]);
      const previousBookmarkedPostsData = queryClient.getQueryData(["bookmarkedPosts"]);
      const previousPinnedPostsData = queryClient.getQueryData([
        "pinnedPosts",
        authUser.username,
      ]);
      const previousPostDetailData = queryClient.getQueryData(["post", originalPostId]);

      // Helper to update repostCount and potentially the repostedBy array
      const updatePostForRepost = (post) => {
        const targetPost = post.repostedFrom ? post.repostedFrom : post;
        const isRepostedByUser = targetPost.repostedBy?.includes(authUser._id);

        let newRepostsCount = targetPost.repostsCount || 0;
        let newRepostedBy = [...(targetPost.repostedBy || [])];

        if (isRepostedByUser) {
          // User is un-reposting
          newRepostsCount = Math.max(0, newRepostsCount - 1);
          newRepostedBy = newRepostedBy.filter((id) => id !== authUser._id);
        } else {
          // User is reposting
          newRepostsCount = newRepostsCount + 1;
          newRepostedBy.push(authUser._id);
        }

        // Return the updated post object, preserving the repostedFrom structure if it exists
        return post.repostedFrom
          ? {
              ...post,
              repostedFrom: {
                ...targetPost,
                repostsCount: newRepostsCount,
                repostedBy: newRepostedBy,
              },
            }
          : {
              ...post,
              repostsCount: newRepostsCount,
              repostedBy: newRepostedBy,
            };
      };

      // A. OPTIMISTIC UPDATE FOR ALL POSTS LIST
      queryClient.setQueryData(["posts"], (oldData) => {
        if (!oldData || !Array.isArray(oldData.pages)) return oldData;
        const newPages = oldData.pages.map((page) => ({
          ...page,
          posts: page.posts.map((post) => {
            if (
              post._id === originalPostId ||
              post.repostedFrom?._id === originalPostId
            ) {
              return updatePostForRepost(post);
            }
            return post;
          }),
        }));
        return { ...oldData, pages: newPages };
      });

      // B. OPTIMISTIC UPDATE FOR BOOKMARKED POSTS LIST
      queryClient.setQueryData(["bookmarkedPosts"], (oldData) => {
        if (!oldData || !Array.isArray(oldData.pages)) return oldData;
        const newPages = oldData.pages.map((page) => ({
          ...page,
          posts: page.posts.map((post) => {
            if (
              post._id === originalPostId ||
              post.repostedFrom?._id === originalPostId
            ) {
              return updatePostForRepost(post);
            }
            return post;
          }),
        }));
        return { ...oldData, pages: newPages };
      });

      // C. OPTIMISTIC UPDATE FOR PINNED POSTS LIST
      queryClient.setQueryData(["pinnedPosts", authUser.username], (oldData) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        return oldData.map((post) => {
          if (post._id === originalPostId || post.repostedFrom?._id === originalPostId) {
            return updatePostForRepost(post);
          }
          return post;
        });
      });

      // D. OPTIMISTIC UPDATE FOR SINGLE POST DETAIL PAGE
      queryClient.setQueryData(["post", originalPostId], (oldData) => {
        if (!oldData || typeof oldData !== "object") return oldData;
        // Apply the update function
        return updatePostForRepost(oldData);
      });

      return {
        previousPostsData,
        previousBookmarkedPostsData,
        previousPinnedPostsData,
        previousPostDetailData,
      };
    },
    onSuccess: (data, originalPostId, context) => {
      toast.success(data.message);

      // Invalidate to refetch actual data and incorporate any new reposted posts
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarkedPosts"] });
      queryClient.invalidateQueries({ queryKey: ["pinnedPosts"] });
      queryClient.invalidateQueries({ queryKey: ["post", originalPostId] });
      queryClient.invalidateQueries({ queryKey: ["authUser"] }); // Invalidate authUser to reflect updated user's repost count/list if applicable
    },
    onError: (error, originalPostId, context) => {
      toast.error(error.message || "Failed to toggle repost status");
      // Rollback
      if (context?.previousPostsData) {
        queryClient.setQueryData(["posts"], context.previousPostsData);
      }
      if (context?.previousBookmarkedPostsData) {
        queryClient.setQueryData(
          ["bookmarkedPosts"],
          context.previousBookmarkedPostsData
        );
      }
      if (context?.previousPinnedPostsData && authUser?.username) {
        queryClient.setQueryData(
          ["pinnedPosts", authUser.username],
          context.previousPinnedPostsData
        );
      }
      if (context?.previousPostDetailData) {
        queryClient.setQueryData(
          ["post", originalPostId],
          context.previousPostDetailData
        );
      }
    },
  });

  return { repostPost, isReposting };
};
