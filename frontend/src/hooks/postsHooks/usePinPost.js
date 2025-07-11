// File: hooks/postsHooks/usePinPost.js

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { pinUnpinPostApi, unpinPostApi } from "../../api/postsApi";
import { useAuthUser } from "../authHooks/useAuthUser";

export const usePinPost = () => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();

  const {
    mutate: pinUnpinPost,
    isPending: isPinning,
    isError,
    error,
  } = useMutation({
    // Simplify mutationFn: it only needs postId and action, as API client doesn't use username
    mutationFn: async ({ postId, action }) => {
      // Removed profileOwnerUsername
      if (action === "pin") {
        return pinUnpinPostApi(postId);
      } else if (action === "unpin") {
        return unpinPostApi(postId);
      }
      throw new Error("Invalid action for pinUnpinPost");
    },

    // onMutate still needs the post object to update cache
    onMutate: async ({ postId, action, post }) => {
      // Removed profileOwnerUsername from here as well
      // Ensure authUser and their username are available for query keys
      if (!authUser?._id || !authUser?.username) {
        console.warn("No authenticated user or username for optimistic pin update.");
        return; // Early exit, no optimistic update if critical data is missing
      }

      // The username for the pinnedPosts query key is ALWAYS the authenticated user's username
      const pinnedPostsQueryKey = ["pinnedPosts", authUser.username];
      const authUserQueryKey = ["authUser"];
      const postDetailQueryKey = ["post", postId];

      // Cancel any outgoing refetches for relevant keys
      await Promise.all([
        queryClient.cancelQueries({ queryKey: pinnedPostsQueryKey }),
        queryClient.cancelQueries({ queryKey: authUserQueryKey }),
        queryClient.cancelQueries({ queryKey: postDetailQueryKey }),
        queryClient.cancelQueries({ queryKey: ["posts"] }), // General feeds
        queryClient.cancelQueries({ queryKey: ["bookmarkedPosts"] }), // Bookmarked feeds
        queryClient.cancelQueries({
          queryKey: ["posts", `/api/posts/user/${authUser.username}`],
        }), // Auth user's own posts feed
      ]);

      // Store previous data for rollback
      const previousPinnedPostsData = queryClient.getQueryData(pinnedPostsQueryKey);
      const previousAuthUserData = queryClient.getQueryData(authUserQueryKey);
      const previousPostDetailData = queryClient.getQueryData(postDetailQueryKey);
      const previousGeneralPostsData = queryClient.getQueryData(["posts"]); // Store for rollback
      const previousBookmarkedPostsData = queryClient.getQueryData(["bookmarkedPosts"]); // Store for rollback
      const previousUserPostsData = queryClient.getQueryData([
        "posts",
        `/api/posts/user/${authUser.username}`,
      ]);

      // Helper to update the `isPinned` status on a post object *in cache*
      // This is a frontend-only flag for optimistic UI
      const updatePostPinStatus = (p, actionType) => {
        if (!p) return p;
        const targetPost = p.repostedFrom ? p.repostedFrom : p;
        const newIsPinnedValue = actionType === "pin";

        if (p.repostedFrom) {
          return {
            ...p,
            repostedFrom: {
              ...targetPost,
              isPinned: newIsPinnedValue,
            },
          };
        } else {
          return {
            ...p,
            isPinned: newIsPinnedValue,
          };
        }
      };

      // Helper to update paginated lists (common for "posts", "bookmarkedPosts", user's own posts)
      const updatePaginatedList = (oldData, targetPostId, actionType) => {
        if (!oldData || !Array.isArray(oldData.pages)) return oldData;
        const newPages = oldData.pages.map((page) => ({
          ...page,
          posts: page.posts.map((p) => {
            if (p._id === targetPostId || p.repostedFrom?._id === targetPostId) {
              return updatePostPinStatus(p, actionType);
            }
            return p;
          }),
        }));
        return { ...oldData, pages: newPages };
      };

      // A. OPTIMISTIC UPDATE FOR MAIN FEEDS (if they display the pin icon)
      queryClient.setQueryData(["posts", "/api/posts/all"], (oldData) =>
        updatePaginatedList(oldData, postId, action)
      );
      queryClient.setQueryData(["posts", "/api/posts/following"], (oldData) =>
        updatePaginatedList(oldData, postId, action)
      );
      queryClient.setQueryData(["bookmarkedPosts"], (oldData) =>
        updatePaginatedList(oldData, postId, action)
      );

      // B. OPTIMISTIC UPDATE FOR SINGLE POST DETAIL PAGE
      queryClient.setQueryData(postDetailQueryKey, (oldData) => {
        if (!oldData || typeof oldData !== "object") return oldData;
        return updatePostPinStatus(oldData, action);
      });

      // C. OPTIMISTIC UPDATE FOR PINNED POSTS LIST (on the user's profile)
      queryClient.setQueryData(pinnedPostsQueryKey, (oldData) => {
        // If oldData is not an array or null, initialize it if pinning
        if (!oldData)
          return action === "pin" && post ? [updatePostPinStatus(post, action)] : [];
        if (!Array.isArray(oldData)) return oldData;

        // Use the 'post' object passed to onMutate. It should be the full post object.
        const targetPostToManipulate = updatePostPinStatus(post, action);

        if (!targetPostToManipulate) {
          console.warn(
            "Could not find post data to optimistically update pinnedPosts list."
          );
          return oldData; // Cannot optimistically update without the full post object
        }

        if (action === "pin") {
          // Add if not already present, and add it to the beginning
          if (!oldData.some((p) => p._id === postId)) {
            return [targetPostToManipulate, ...oldData];
          }
        } else if (action === "unpin") {
          // Remove from the list
          return oldData.filter((p) => p._id !== postId);
        }
        return oldData;
      });

      // D. OPTIMISTIC UPDATE FOR AUTH USER PROFILE (its pinnedPosts ID array)
      queryClient.setQueryData(authUserQueryKey, (oldData) => {
        if (!oldData) return oldData;
        const newPinnedPostsIds = oldData.pinnedPosts || [];
        if (action === "pin") {
          if (!newPinnedPostsIds.includes(postId)) {
            return { ...oldData, pinnedPosts: [postId, ...newPinnedPostsIds] }; // Add ID
          }
        } else if (action === "unpin") {
          return {
            ...oldData,
            pinnedPosts: newPinnedPostsIds.filter((id) => id !== postId), // Remove ID
          };
        }
        return oldData;
      });

      // E. OPTIMISTIC UPDATE FOR THE USER'S OWN POSTS FEED
      queryClient.setQueryData(
        ["posts", `/api/posts/user/${authUser.username}`],
        (oldData) => updatePaginatedList(oldData, postId, action)
      );

      return {
        previousPinnedPostsData,
        previousAuthUserData,
        previousPostDetailData,
        previousGeneralPostsData,
        previousBookmarkedPostsData,
        previousUserPostsData,
      };
    },

    onSuccess: (data, variables) => {
      toast.success(data.message);
      const { postId } = variables; // Access from variables, username not needed here

      if (authUser?.username) {
        queryClient.invalidateQueries({ queryKey: ["pinnedPosts", authUser.username] });
        queryClient.invalidateQueries({
          queryKey: ["posts", `/api/posts/user/${authUser.username}`],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] }); // General feeds
      queryClient.invalidateQueries({ queryKey: ["post", postId] }); // Single post view
      queryClient.invalidateQueries({ queryKey: ["bookmarkedPosts"] }); // Bookmarked posts feed
    },

    onError: (error, variables, context) => {
      toast.error(error.message || "Failed to update pin status");
      // Rollback optimistic updates using the stored context
      if (context) {
        // Rollback general feeds
        if (context.previousGeneralPostsData) {
          queryClient.setQueryData(
            ["posts", "/api/posts/all"],
            context.previousGeneralPostsData
          );
        }
        if (context.previousBookmarkedPostsData) {
          queryClient.setQueryData(
            ["bookmarkedPosts"],
            context.previousBookmarkedPostsData
          );
        }
        if (context.previousUserPostsData && authUser?.username) {
          queryClient.setQueryData(
            ["posts", `/api/posts/user/${authUser.username}`],
            context.previousUserPostsData
          );
        }

        if (authUser?.username && context.previousPinnedPostsData) {
          queryClient.setQueryData(
            ["pinnedPosts", authUser.username],
            context.previousPinnedPostsData
          );
        }
        if (context.previousPostDetailData) {
          queryClient.setQueryData(
            ["post", variables.postId],
            context.previousPostDetailData
          );
        }
        if (context.previousAuthUserData) {
          queryClient.setQueryData(["authUser"], context.previousAuthUserData);
        }
      }
    },
  });

  return { pinUnpinPost, isPinning, isError, error };
};
