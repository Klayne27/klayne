import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuthUser } from "../authHooks/useAuthUser";
import { showAppToast } from "../../utils/showAppToast";

export const useRepostPost = (POST_ENDPOINT) => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();

  const queryKey = ["posts", POST_ENDPOINT];

  const { mutate: repostPost, isPending: isReposting } = useMutation({
    mutationFn: async (postId) => {
      try {
        const response = await fetch(`/api/posts/repost/${postId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to toggle repost status");
        }
        return data;
      } catch (error) {
        throw new Error(error.message || "An unknown error occurred");
      }
    },

    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey });

      const previousPostsData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData || !oldData.pages) return oldData;

        const updatePost = (postToUpdate) => {
          const isReposted = postToUpdate.repostedBy.includes(authUser._id);
          if (isReposted) {
            postToUpdate.repostedBy = postToUpdate.repostedBy.filter(
              (id) => id !== authUser._id
            );
            postToUpdate.repostsCount -= 1;
          } else {
            postToUpdate.repostedBy.push(authUser._id);
            postToUpdate.repostsCount += 1;
          }
        };

        const newData = {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) => {
              if (post.repostedFrom && post.repostedFrom._id === postId) {
                const newPost = { ...post, repostedFrom: { ...post.repostedFrom } };
                updatePost(newPost.repostedFrom);
                return newPost;
              }

              if (post._id === postId) {
                const newPost = { ...post };
                updatePost(newPost);
                return newPost;
              }
              return post;
            }),
          })),
        };

        return newData;
      });

      return { previousPostsData };
    },

    onError: (err, postId, context) => {
      showAppToast(err.message || "Could not update repost.", "error");
      if (context?.previousPostsData) {
        queryClient.setQueryData(queryKey, context.previousPostsData);
      }
    },

    onSuccess: (data) => {
      showAppToast(data.message || "Success!", "success");
    },
  });

  return { repostPost, isReposting };
};

