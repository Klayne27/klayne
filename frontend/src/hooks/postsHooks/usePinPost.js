import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pinUnpinPostApi, unpinPostApi } from "../../api/postsApi";
import { useAuthUser } from "../authHooks/useAuthUser";
import { showAppToast } from "../../utils/showAppToast";

export const usePinPost = () => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();

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

    onMutate: async ({ postId, action, post }) => {
      if (!authUser?._id || !authUser?.username) {
        console.warn("No authenticated user or username for optimistic pin update.");
        return;
      }

      const pinnedPostsQueryKey = ["pinnedPosts", authUser.username];
      const authUserQueryKey = ["authUser"];
      const postDetailQueryKey = ["post", postId];

      await Promise.all([
        queryClient.cancelQueries({ queryKey: pinnedPostsQueryKey }),
        queryClient.cancelQueries({ queryKey: authUserQueryKey }),
        queryClient.cancelQueries({ queryKey: postDetailQueryKey }),
        queryClient.cancelQueries({ queryKey: ["posts"] }),
        queryClient.cancelQueries({ queryKey: ["bookmarkedPosts"] }),
        queryClient.cancelQueries({
          queryKey: ["posts", `/api/posts/user/${authUser.username}`],
        }),
      ]);

      const previousPinnedPostsData = queryClient.getQueryData(pinnedPostsQueryKey);
      const previousAuthUserData = queryClient.getQueryData(authUserQueryKey);
      const previousPostDetailData = queryClient.getQueryData(postDetailQueryKey);
      const previousGeneralPostsData = queryClient.getQueryData(["posts"]); 
      const previousBookmarkedPostsData = queryClient.getQueryData(["bookmarkedPosts"]); 
      const previousUserPostsData = queryClient.getQueryData([
        "posts",
        `/api/posts/user/${authUser.username}`,
      ]);

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

      queryClient.setQueryData(["posts", "/api/posts/all"], (oldData) =>
        updatePaginatedList(oldData, postId, action)
      );
      // queryClient.setQueryData(["posts", "/api/posts/following"], (oldData) =>
      //   updatePaginatedList(oldData, postId, action)
      // );
      queryClient.setQueryData(["bookmarkedPosts"], (oldData) =>
        updatePaginatedList(oldData, postId, action)
      );

      queryClient.setQueryData(postDetailQueryKey, (oldData) => {
        if (!oldData || typeof oldData !== "object") return oldData;
        return updatePostPinStatus(oldData, action);
      });

      queryClient.setQueryData(pinnedPostsQueryKey, (oldData) => {
        if (!oldData)
          return action === "pin" && post ? [updatePostPinStatus(post, action)] : [];
        if (!Array.isArray(oldData)) return oldData;

        const targetPostToManipulate = updatePostPinStatus(post, action);

        if (!targetPostToManipulate) {
          console.warn(
            "Could not find post data to optimistically update pinnedPosts list."
          );
          return oldData;
        }

        if (action === "pin") {
          if (!oldData.some((p) => p._id === postId)) {
            return [targetPostToManipulate, ...oldData];
          }
        } else if (action === "unpin") {
          return oldData.filter((p) => p._id !== postId);
        }
        return oldData;
      });

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
      showAppToast(data.message, "success");
      const { postId } = variables; 

      if (authUser?.username) {
        queryClient.invalidateQueries({ queryKey: ["pinnedPosts", authUser.username] });
        queryClient.invalidateQueries({
          queryKey: ["posts", `/api/posts/user/${authUser.username}`],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({ queryKey: ["bookmarkedPosts"] });
    },

    onError: (error, variables, context) => {
      showAppToast(error.message || "Failed to update pin status", "error");
      if (context) {
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
