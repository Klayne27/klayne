// hooks/postsHooks/useToggleBookmarks.js

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toggleBookmarkApi } from "../../api/postsApi";
import toast from "react-hot-toast";
import { useAuthUser } from "../authHooks/useAuthUser";
import { showAppToast } from "../../utils/showAppToast";

export const useToggleBookmarks = (
  currentProfileUsername = null,
  profileOwnerId = null
) => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();

  const { mutate: toggleBookmark, isPending: isBookmarking } = useMutation({
    mutationFn: toggleBookmarkApi,

    onMutate: async (postId) => {
      if (!authUser?._id) {
        console.warn("No authenticated user ID for optimistic bookmark update.");
        return;
      }

      const dynamicUserPostsKey = currentProfileUsername
        ? ["posts", `/api/posts/user/${currentProfileUsername}`]
        : null;

      const dynamicUserLikedPostsKey = profileOwnerId
        ? ["posts", `/api/posts/likes/${profileOwnerId}`]
        : null;

      // Add the specific pinnedPosts key IF it's likely to be used on the current profile
      // This is crucial if pinnedPosts has its own dedicated query cache entry.
      const pinnedPostsQueryKey = currentProfileUsername
        ? ["pinnedPosts", currentProfileUsername] // Assuming this is your key for fetching pinned posts for the current user's profile
        : null;

      const queryKeysToUpdate = [
        ["posts", "/api/posts/all"],
        ["posts", "/api/posts/following"],
        ["bookmarkedPosts"],
        ["post", postId],
        ...(dynamicUserPostsKey ? [dynamicUserPostsKey] : []),
        ...(dynamicUserLikedPostsKey ? [dynamicUserLikedPostsKey] : []),
        ...(pinnedPostsQueryKey ? [pinnedPostsQueryKey] : []), // Include pinnedPosts key
      ].filter(Boolean);

      // Cancel any outgoing refetches for the queries we are about to update optimistically
      await Promise.all(
        queryKeysToUpdate.map((key) => queryClient.cancelQueries({ queryKey: key }))
      );

      // Snapshot the previous data for rollback in case of an error
      const previousDataSnapshots = {};
      queryKeysToUpdate.forEach((key) => {
        const snapshotKey = JSON.stringify(key); // Use stringify to create a unique key
        previousDataSnapshots[snapshotKey] = queryClient.getQueryData(key);
      });

      // --- Helper for updating a single post's bookmark status ---
      const updatePostBookmarkStatus = (post, userId) => {
        if (!post) return post;
        // Determine the actual post object to modify (original or reposted)
        const targetPost =
          post.repostedFrom && post.repostedFrom._id === postId
            ? post.repostedFrom
            : post._id === postId
            ? post
            : null;

        // If this post is not the one we're toggling, or it's a repost but the original isn't the target, return it as is
        if (!targetPost) return post;

        const isAlreadyBookmarked = targetPost.bookmarkedBy?.includes(userId);

        const newBookmarkedBy = isAlreadyBookmarked
          ? (targetPost.bookmarkedBy || []).filter((id) => id !== userId)
          : [...(targetPost.bookmarkedBy || []), userId];

        if (post.repostedFrom && post.repostedFrom._id === postId) {
          // If the post is a repost and the target is the original post
          return {
            ...post,
            repostedFrom: {
              ...targetPost,
              bookmarkedBy: newBookmarkedBy,
            },
          };
        } else if (post._id === postId) {
          // If the post itself is the target
          return {
            ...post,
            bookmarkedBy: newBookmarkedBy,
          };
        }
        return post; // Should not be reached if targetPost was correctly identified
      };

      // --- Optimistic Update Logic ---

      // Helper for paginated lists (e.g., all posts, following, user posts, liked posts)
      const updatePaginatedList = (oldData) => {
        if (!oldData || !Array.isArray(oldData.pages)) return oldData;
        const newPages = oldData.pages.map((page) => ({
          ...page,
          posts: page.posts.map((post) => updatePostBookmarkStatus(post, authUser._id)),
        }));
        return { ...oldData, pages: newPages };
      };

      // Helper for a single post object (e.g., post detail page)
      const updateSinglePostObject = (oldData) => {
        return updatePostBookmarkStatus(oldData, authUser._id);
      };

      // Helper for a simple array of posts (like pinned posts)
      const updatePostArray = (oldData) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        return oldData.map((post) => updatePostBookmarkStatus(post, authUser._id));
      };

      // Apply updates to all relevant caches
      queryClient.setQueryData(["posts", "/api/posts/all"], updatePaginatedList);
      queryClient.setQueryData(["posts", "/api/posts/following"], updatePaginatedList);

      // Special handling for bookmarkedPosts: if the post is now unbookmarked, remove it from the list
      queryClient.setQueryData(["bookmarkedPosts"], (oldData) => {
        const updatedData = updatePaginatedList(oldData);
        // Ensure the data structure for bookmarkedPosts is compatible with updatePaginatedList
        // If it's a simple array of posts, you might need a different filter here.
        // Assuming it's paginated like other main feeds for consistency.
        if (!updatedData || !Array.isArray(updatedData.pages)) return oldData;

        const newPages = updatedData.pages.map((page) => ({
          ...page,
          posts: page.posts.filter((p) => {
            const actualPost =
              p.repostedFrom && p.repostedFrom._id === postId ? p.repostedFrom : p;
            return !(
              actualPost._id === postId &&
              !actualPost.bookmarkedBy?.includes(authUser._id)
            );
          }),
        }));
        return { ...updatedData, pages: newPages };
      });

      queryClient.setQueryData(["post", postId], updateSinglePostObject);

      if (dynamicUserPostsKey) {
        queryClient.setQueryData(dynamicUserPostsKey, updatePaginatedList);
      }
      if (dynamicUserLikedPostsKey) {
        queryClient.setQueryData(dynamicUserLikedPostsKey, updatePaginatedList);
      }

      // --- NEW: Optimistically update the pinnedPosts cache ---
      if (pinnedPostsQueryKey) {
        queryClient.setQueryData(pinnedPostsQueryKey, updatePostArray);
      }

      return previousDataSnapshots;
    },

    onSuccess: (data, postId) => {
      showAppToast(data.message, "success");

      // Invalidate general post lists to ensure eventual consistency
      queryClient.invalidateQueries({ queryKey: ["posts", "/api/posts/all"] });
      queryClient.invalidateQueries({ queryKey: ["posts", "/api/posts/following"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarkedPosts"] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });

      // Invalidate dynamic user posts if applicable
      if (currentProfileUsername) {
        queryClient.invalidateQueries({
          queryKey: ["posts", `/api/posts/user/${currentProfileUsername}`],
        });
      }

      // Invalidate liked posts if applicable
      if (profileOwnerId) {
        queryClient.invalidateQueries({
          queryKey: ["posts", `/api/posts/likes/${profileOwnerId}`],
        });
      }
    },

    onError: (error, postId, context) => {
      console.error("Error toggling bookmark: ", error);
      showAppToast(error.message || "Failed to toggle bookmark", "error");

      if (context?.previousDataSnapshots) {
        // Rollback all queries that were optimistically updated
        for (const snapshotKey in context.previousDataSnapshots) {
          const queryKey = JSON.parse(snapshotKey);
          queryClient.setQueryData(queryKey, context.previousDataSnapshots[snapshotKey]);
        }
      } else {
        // Fallback to invalidation if no snapshot was taken (e.g., during initial load race condition)
        queryClient.invalidateQueries({ queryKey: ["posts"] });
        queryClient.invalidateQueries({ queryKey: ["bookmarkedPosts"] });
        queryClient.invalidateQueries({ queryKey: ["post", postId] });
        if (currentProfileUsername) {
          queryClient.invalidateQueries({
            queryKey: ["posts", `/api/posts/user/${currentProfileUsername}`],
          });
        }
        if (profileOwnerId) {
          queryClient.invalidateQueries({
            queryKey: ["posts", `/api/posts/likes/${profileOwnerId}`],
          });
        }
        // Invalidate pinned posts on error if a specific query key exists and wasn't snapshotted
        if (currentProfileUsername) {
          queryClient.invalidateQueries({
            queryKey: ["pinnedPosts", currentProfileUsername],
          });
        }
      }
    },
  });

  return { toggleBookmark, isBookmarking };
};
