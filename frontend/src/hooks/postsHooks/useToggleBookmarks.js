import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toggleBookmarkApi } from "../../api/postsApi";
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

      const pinnedPostsQueryKey = currentProfileUsername
        ? ["pinnedPosts", currentProfileUsername]
        : null;

      const queryKeysToUpdate = [
        ["posts", "/api/posts/all"],
        ["posts", "/api/posts/following"],
        ["bookmarkedPosts"],
        ["post", postId],
        ...(dynamicUserPostsKey ? [dynamicUserPostsKey] : []),
        ...(dynamicUserLikedPostsKey ? [dynamicUserLikedPostsKey] : []),
        ...(pinnedPostsQueryKey ? [pinnedPostsQueryKey] : []),
      ].filter(Boolean);

      await Promise.all(
        queryKeysToUpdate.map((key) => queryClient.cancelQueries({ queryKey: key }))
      );

      const previousDataSnapshots = {};
      queryKeysToUpdate.forEach((key) => {
        const snapshotKey = JSON.stringify(key);
        previousDataSnapshots[snapshotKey] = queryClient.getQueryData(key);
      });

      const updatePostBookmarkStatus = (post, userId) => {
        if (!post) return post;
        const targetPost =
          post.repostedFrom && post.repostedFrom._id === postId
            ? post.repostedFrom
            : post._id === postId
            ? post
            : null;

        if (!targetPost) return post;

        const isAlreadyBookmarked = targetPost.bookmarkedBy?.includes(userId);

        const newBookmarkedBy = isAlreadyBookmarked
          ? (targetPost.bookmarkedBy || []).filter((id) => id !== userId)
          : [...(targetPost.bookmarkedBy || []), userId];

        if (post.repostedFrom && post.repostedFrom._id === postId) {
          return {
            ...post,
            repostedFrom: {
              ...targetPost,
              bookmarkedBy: newBookmarkedBy,
            },
          };
        } else if (post._id === postId) {
          return {
            ...post,
            bookmarkedBy: newBookmarkedBy,
          };
        }
        return post;
      };

      const updatePaginatedList = (oldData) => {
        if (!oldData || !Array.isArray(oldData.pages)) return oldData;
        const newPages = oldData.pages.map((page) => ({
          ...page,
          posts: page.posts.map((post) => updatePostBookmarkStatus(post, authUser._id)),
        }));
        return { ...oldData, pages: newPages };
      };

      const updateSinglePostObject = (oldData) => {
        return updatePostBookmarkStatus(oldData, authUser._id);
      };

      const updatePostArray = (oldData) => {
        if (!oldData || !Array.isArray(oldData)) return oldData;
        return oldData.map((post) => updatePostBookmarkStatus(post, authUser._id));
      };

      queryClient.setQueryData(["posts", "/api/posts/all"], updatePaginatedList);
      queryClient.setQueryData(["posts", "/api/posts/following"], updatePaginatedList);

      queryClient.setQueryData(["bookmarkedPosts"], (oldData) => {
        const updatedData = updatePaginatedList(oldData);
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

      if (pinnedPostsQueryKey) {
        queryClient.setQueryData(pinnedPostsQueryKey, updatePostArray);
      }

      return previousDataSnapshots;
    },

    onSuccess: (data, postId) => {
      showAppToast(data.message, "success");
      queryClient.invalidateQueries({ queryKey: ["bookmarkedPosts"] });
      // queryClient.invalidateQueries({ queryKey: ["posts", "/api/posts/all"] });
      // queryClient.invalidateQueries({ queryKey: ["posts", "/api/posts/following"] });
      // queryClient.invalidateQueries({ queryKey: ["post", postId] });

      // if (currentProfileUsername) {
      //   queryClient.invalidateQueries({
      //     queryKey: ["posts", `/api/posts/user/${currentProfileUsername}`],
      //   });
      // }

      // if (profileOwnerId) {
      //   queryClient.invalidateQueries({
      //     queryKey: ["posts", `/api/posts/likes/${profileOwnerId}`],
      //   });
      // }
    },

    onError: (error, postId, context) => {
      console.error("Error toggling bookmark: ", error);
      showAppToast(error.message || "Failed to toggle bookmark", "error");

      if (context?.previousDataSnapshots) {
        for (const snapshotKey in context.previousDataSnapshots) {
          const queryKey = JSON.parse(snapshotKey);
          queryClient.setQueryData(queryKey, context.previousDataSnapshots[snapshotKey]);
        }
      } else {
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
