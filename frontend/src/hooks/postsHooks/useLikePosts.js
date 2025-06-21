import { useMutation, useQueryClient } from "@tanstack/react-query";
import { likePostApi } from "../../api/postsApi";
import toast from "react-hot-toast";
import { useAuthUser } from "../authHooks/useAuthUser";

export const useLikePost = (post) => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();

  const { mutate: likePost, isPending: isLiking } = useMutation({
    mutationFn: () => likePostApi(post),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      await queryClient.cancelQueries({ queryKey: ["posts", postId] });

      const previousPostsData = queryClient.getQueryData(["posts"]);
      const previousPostDetailData = queryClient.getQueryData(["posts", postId]);

      queryClient.setQueryData(["posts"], (oldData) => {
        if (!oldData || !Array.isArray(oldData.pages)) {
          return oldData;
        }

        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            posts: Array.isArray(page.posts)
              ? page.posts.map((post) => {
                  if (post._id === postId) {
                    const isLiked = post.likes?.includes(authUser?._id);
                    return {
                      ...post,
                      likes: isLiked
                        ? (post.likes || []).filter((id) => id !== authUser?._id)
                        : [...(post.likes || []), authUser?._id],
                    };
                  }
                  return post;
                })
              : page.posts,
          })),
        };
      });

      queryClient.setQueryData(["posts", postId], (oldData) => {
        if (!oldData) {
          return oldData;
        }
        const isLiked = oldData.likes?.includes(authUser?._id);
        return {
          ...oldData,
          likes: isLiked
            ? (oldData.likes || []).filter((id) => id !== authUser?._id)
            : [...(oldData.likes || []), authUser?._id],
        };
      });

      return { previousPostsData, previousPostDetailData };
    },

    onSuccess: (data, postId) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post"] });
      queryClient.invalidateQueries({ queryKey: ["posts", postId] });
    },

    onError: (error, postId, context) => {
      toast.error(error.message || "Failed to like/unlike post.");
      if (context?.previousPostsData) {
        queryClient.setQueryData(["posts"], context.previousPostsData);
      }
      if (context?.previousPostDetailData) {
        queryClient.setQueryData(["posts", postId], context.previousPostDetailData);
      }
    },
  });

  return { likePost, isLiking };
};
