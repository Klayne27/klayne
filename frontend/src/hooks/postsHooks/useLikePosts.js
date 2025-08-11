import { useMutation, useQueryClient } from "@tanstack/react-query";
import { likePostApi } from "../../api/postsApi";
import { useAuthUser } from "../authHooks/useAuthUser";
import { showAppToast } from "../../utils/showAppToast";

export const useLikePost = (username = null) => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();

  const { mutate: likePost, isPending: isLiking } = useMutation({
    mutationFn: (postId) => likePostApi(postId),

    onMutate: async (postId) => {
      if (!authUser?._id) {
        console.warn("No authenticated user ID for optimistic post like update.");
        return;
      }

      const dynamicUserPostsKey = username
        ? ["posts", `/api/posts/user/${username}`]
        : null;

      const dynamicUserLikesKey = username
        ? ["posts", `/api/posts/likes/${username}`]
        : null;

      const queryKeysToUpdate = [
        ["posts", "/api/posts/all"],
        ["posts", "/api/posts/following"],
        ["bookmarkedPosts"],

        ...(dynamicUserPostsKey ? [dynamicUserPostsKey] : []),
        ...(dynamicUserLikesKey ? [dynamicUserLikesKey] : []),
      ].filter(Boolean);

      await Promise.all(
        queryKeysToUpdate.map((key) => queryClient.cancelQueries({ queryKey: key }))
      );
      await queryClient.cancelQueries({ queryKey: ["pinnedPosts", username] });
      await queryClient.cancelQueries({ queryKey: ["post", postId] });

      const previousDataSnapshots = {};
      previousDataSnapshots["posts_all"] = queryClient.getQueryData([
        "posts",
        "/api/posts/all",
      ]);
      previousDataSnapshots["posts_following"] = queryClient.getQueryData([
        "posts",
        "/api/posts/following",
      ]);
      previousDataSnapshots["bookmarkedPosts"] = queryClient.getQueryData([
        "bookmarkedPosts",
      ]);
      previousDataSnapshots["pinnedPosts"] = queryClient.getQueryData([
        "pinnedPosts",
        username,
      ]);
      previousDataSnapshots["postDetail"] = queryClient.getQueryData(["post", postId]);

      if (dynamicUserPostsKey) {
        previousDataSnapshots["posts_user"] =
          queryClient.getQueryData(dynamicUserPostsKey);
      }
      if (dynamicUserLikesKey) {
        previousDataSnapshots["posts_likes"] =
          queryClient.getQueryData(dynamicUserLikesKey);
      }

      const updatePaginatedList = (oldData) => {
        if (!oldData || !Array.isArray(oldData.pages)) {
          return oldData;
        }
        const newPages = oldData.pages.map((page) => ({
          ...page,
          posts: Array.isArray(page.posts)
            ? page.posts.map((post) => {
                const isTargetOfLike = post._id === postId;
                const isOriginalTargetOfRepost =
                  post.repostedFrom && post.repostedFrom._id === postId;

                if (isTargetOfLike || isOriginalTargetOfRepost) {
                  const targetPostForLikes = isOriginalTargetOfRepost
                    ? post.repostedFrom
                    : post;
                  const isAlreadyLiked = targetPostForLikes.likes?.includes(
                    authUser?._id
                  );
                  const newLikes = isAlreadyLiked
                    ? (targetPostForLikes.likes || []).filter(
                        (id) => id !== authUser?._id
                      )
                    : [...(targetPostForLikes.likes || []), authUser?._id];

                  if (isOriginalTargetOfRepost) {
                    return {
                      ...post,
                      repostedFrom: {
                        ...targetPostForLikes,
                        likes: newLikes,
                      },
                    };
                  } else {
                    return {
                      ...post,
                      likes: newLikes,
                    };
                  }
                }
                return post;
              })
            : page.posts,
        }));
        return { ...oldData, pages: newPages };
      };

      const updateSinglePostArray = (oldData) => {
        if (!oldData || !Array.isArray(oldData)) {
          return oldData;
        }
        return oldData.map((post) => {
          const isTargetOfLike = post._id === postId;
          const isOriginalTargetOfRepost =
            post.repostedFrom && post.repostedFrom._id === postId;

          if (isTargetOfLike || isOriginalTargetOfRepost) {
            const targetPostForLikes = isOriginalTargetOfRepost
              ? post.repostedFrom
              : post;
            const isAlreadyLiked = targetPostForLikes.likes?.includes(authUser._id);
            const newLikes = isAlreadyLiked
              ? (targetPostForLikes.likes || []).filter((id) => id !== authUser._id)
              : [...(targetPostForLikes.likes || []), authUser._id];

            if (isOriginalTargetOfRepost) {
              return {
                ...post,
                repostedFrom: {
                  ...targetPostForLikes,
                  likes: newLikes,
                },
              };
            } else {
              return {
                ...post,
                likes: newLikes,
              };
            }
          }
          return post;
        });
      };

      const updateSinglePostObject = (oldData) => {
        if (
          !oldData ||
          typeof oldData !== "object" ||
          Object.keys(oldData).length === 0
        ) {
          return oldData;
        }
        const targetForLikeUpdate =
          oldData.repostedFrom?._id === postId ? oldData.repostedFrom : oldData;

        if (targetForLikeUpdate._id !== postId) {
          return oldData;
        }

        const isLiked = targetForLikeUpdate.likes?.includes(authUser?._id);
        const newLikes = isLiked
          ? (targetForLikeUpdate.likes || []).filter((id) => id !== authUser?._id)
          : [...(targetForLikeUpdate.likes || []), authUser?._id];

        if (oldData._id === postId) {
          return { ...oldData, likes: newLikes };
        } else if (oldData.repostedFrom && oldData.repostedFrom._id === postId) {
          return {
            ...oldData,
            repostedFrom: { ...oldData.repostedFrom, likes: newLikes },
          };
        }
        return oldData;
      };

      queryClient.setQueryData(["posts", "/api/posts/all"], updatePaginatedList);
      queryClient.setQueryData(["posts", "/api/posts/following"], updatePaginatedList);
      queryClient.setQueryData(["bookmarkedPosts"], updatePaginatedList);
      queryClient.setQueryData(["pinnedPosts", username], updateSinglePostArray);
      queryClient.setQueryData(["post", postId], updateSinglePostObject);

      if (dynamicUserPostsKey) {
        queryClient.setQueryData(dynamicUserPostsKey, updatePaginatedList);
      }
      if (dynamicUserLikesKey) {
        queryClient.setQueryData(dynamicUserLikesKey, updatePaginatedList);
      }

      return previousDataSnapshots;
    },

    onSuccess: (data, postId) => {
      // queryClient.invalidateQueries({ queryKey: ["posts"] });  // uncomment if unexpected bugs occur
      queryClient.invalidateQueries({ queryKey: ["bookmarkedPosts"] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
    },

    onError: (error, postId, context) => {
      showAppToast(error.message|| "Failed to like/unlike post.");
      if (context?.previousDataSnapshots) {
        queryClient.setQueryData(
          ["posts", "/api/posts/all"],
          context.previousDataSnapshots["posts_all"]
        );
        queryClient.setQueryData(
          ["posts", "/api/posts/following"],
          context.previousDataSnapshots["posts_following"]
        );
        queryClient.setQueryData(
          ["bookmarkedPosts"],
          context.previousDataSnapshots["bookmarkedPosts"]
        );

        if (context.previousDataSnapshots["posts_user"] && username) {
          queryClient.setQueryData(
            ["posts", `/api/posts/user/${username}`],
            context.previousDataSnapshots["posts_user"]
          );
        }
        if (context.previousDataSnapshots["posts_likes"] && username) {
          queryClient.setQueryData(
            ["posts", `/api/posts/likes/${username}`],
            context.previousDataSnapshots["posts_likes"]
          );
        }

        if (username && context.previousDataSnapshots["pinnedPosts"]) {
          queryClient.setQueryData(
            ["pinnedPosts", username],
            context.previousDataSnapshots["pinnedPosts"]
          );
        } else if (username) {
          queryClient.invalidateQueries({ queryKey: ["pinnedPosts", username] });
        }

        queryClient.setQueryData(
          ["post", postId],
          context.previousDataSnapshots["postDetail"]
        );
      }
    },
  });

  return { likePost, isLiking };
};
