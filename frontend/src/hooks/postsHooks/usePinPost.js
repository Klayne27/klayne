import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { pinUnpinPostApi, unpinPostApi } from "../../api/postsApi"; // Assuming these are correct
import { useAuthUser } from "../authHooks/useAuthUser"; // Assuming this is available

export const usePinPost = () => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser(); // Needed for optimistic updates and pinnedPosts key

  const {
    mutate: pinUnpinPost,
    isPending: isPinning,
    isError,
    error,
  } = useMutation({
    mutationFn: async ({ postId, action }) => {
      if (action === "pin") {
        return pinUnpinPostApi(postId);
      } else if (action === "unpin") {
        return unpinPostApi(postId);
      }
      throw new Error("Invalid action for pinUnpinPost");
    },
    onMutate: async ({ postId, action, username }) => {
      // username is needed for pinnedPosts key
      if (!authUser?._id) {
        console.warn("No authenticated user ID for optimistic pin update.");
        return;
      }

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      await queryClient.cancelQueries({ queryKey: ["bookmarkedPosts"] });
      await queryClient.cancelQueries({ queryKey: ["pinnedPosts", username] });
      await queryClient.cancelQueries({ queryKey: ["post", postId] });
      await queryClient.cancelQueries({ queryKey: ["authUser"] }); // Invalidate authUser as pinned posts affect user profile

      // Store previous data for rollback
      const previousPostsData = queryClient.getQueryData(["posts"]);
      const previousBookmarkedPostsData = queryClient.getQueryData(["bookmarkedPosts"]);
      const previousPinnedPostsData = queryClient.getQueryData(["pinnedPosts", username]);
      const previousPostDetailData = queryClient.getQueryData(["post", postId]);
      const previousAuthUserData = queryClient.getQueryData(["authUser"]);

      // Helper to update the `isPinned` status on a post object
      const updatePostPinStatus = (post, actionType) => {
        const targetPost = post.repostedFrom ? post.repostedFrom : post;
        const newIsPinned = actionType === "pin";

        return post.repostedFrom
          ? {
              ...post,
              repostedFrom: {
                ...targetPost,
                isPinned: newIsPinned,
              },
            }
          : {
              ...post,
              isPinned: newIsPinned,
            };
      };

      // A. OPTIMISTIC UPDATE FOR ALL POSTS LIST
      queryClient.setQueryData(["posts"], (oldData) => {
        if (!oldData || !Array.isArray(oldData.pages)) return oldData;
        const newPages = oldData.pages.map((page) => ({
          ...page,
          posts: page.posts.map((post) => {
            if (post._id === postId || post.repostedFrom?._id === postId) {
              return updatePostPinStatus(post, action);
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
            if (post._id === postId || post.repostedFrom?._id === postId) {
              return updatePostPinStatus(post, action);
            }
            return post;
          }),
        }));
        return { ...oldData, pages: newPages };
      });

      // C. OPTIMISTIC UPDATE FOR SINGLE POST DETAIL PAGE
      queryClient.setQueryData(["post", postId], (oldData) => {
        if (!oldData || typeof oldData !== "object") return oldData;
        return updatePostPinStatus(oldData, action);
      });

      // D. OPTIMISTIC UPDATE FOR PINNED POSTS LIST (This one is tricky for add/remove)
      // For pinnedPosts, we need the *full post object* to add it.
      // We can try to get it from previousPostDetailData or other caches.
      queryClient.setQueryData(["pinnedPosts", username], (oldData) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;

        const postToPinOrUnpin =
          previousPostDetailData || // Try to get the full post data from the detail page cache
          previousPostsData?.pages
            ?.flatMap((p) => p.posts)
            .find((p) => p._id === postId) || // Or from the main feed cache
          previousBookmarkedPostsData?.pages
            ?.flatMap((p) => p.posts)
            .find((p) => p._id === postId); // Or from bookmarks

        if (!postToPinOrUnpin) {
          // If we can't find the full post object, we can't optimistically add it.
          // In this case, just return oldData, and rely on onSuccess invalidation.
          return oldData;
        }

        const updatedPinnedPost = updatePostPinStatus(postToPinOrUnpin, action);

        if (action === "pin") {
          // Add if not already present
          if (!oldData.some((p) => p._id === postId)) {
            return [...oldData, updatedPinnedPost];
          }
        } else if (action === "unpin") {
          // Remove from the list
          return oldData.filter((p) => p._id !== postId);
        }
        return oldData; // No change if not pin/unpin or post already exists/removed
      });

      // E. OPTIMISTIC UPDATE FOR AUTH USER (e.g., if user object has a `pinnedPost` array/id)
      queryClient.setQueryData(["authUser"], (oldData) => {
        if (!oldData) return oldData;
        const newPinnedPosts = oldData.pinnedPosts || []; // Assuming authUser has a pinnedPosts array or ID
        if (action === "pin") {
          // Add postId if not already in the user's pinned list
          if (!newPinnedPosts.includes(postId)) {
            return { ...oldData, pinnedPosts: [...newPinnedPosts, postId] };
          }
        } else if (action === "unpin") {
          // Remove postId if present
          return {
            ...oldData,
            pinnedPosts: newPinnedPosts.filter((id) => id !== postId),
          };
        }
        return oldData;
      });

      return {
        previousPostsData,
        previousBookmarkedPostsData,
        previousPinnedPostsData,
        previousPostDetailData,
        previousAuthUserData,
      };
    },
    onSuccess: (data, variables) => {
      toast.success(data.message);
      const { postId, username } = variables;

      // Invalidate all relevant queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["pinnedPosts", username] }); // Invalidate specific user's pinned posts
      queryClient.invalidateQueries({ queryKey: ["authUser"] }); // Invalidate authUser to reflect updated user's pinned posts
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["bookmarkedPosts"] });
    },
    onError: (error, variables, context) => {
      toast.error(error.message || "Failed to update pin status");
      // Rollback optimistic updates
      if (context?.previousPostsData) {
        queryClient.setQueryData(["posts"], context.previousPostsData);
      }
      if (context?.previousBookmarkedPostsData) {
        queryClient.setQueryData(
          ["bookmarkedPosts"],
          context.previousBookmarkedPostsData
        );
      }
      if (context?.previousPinnedPostsData && variables.username) {
        // Use variables.username for rollback
        queryClient.setQueryData(
          ["pinnedPosts", variables.username],
          context.previousPinnedPostsData
        );
      }
      if (context?.previousPostDetailData) {
        queryClient.setQueryData(
          ["post", variables.postId],
          context.previousPostDetailData
        );
      }
      if (context?.previousAuthUserData) {
        queryClient.setQueryData(["authUser"], context.previousAuthUserData);
      }
    },
  });

  return { pinUnpinPost, isPinning, isError, error };
};
