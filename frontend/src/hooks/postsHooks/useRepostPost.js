import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuthUser } from "../authHooks/useAuthUser"; // Assuming this is available
import { showAppToast } from "../../utils/showAppToast";

export const useRepostPost = (POST_ENDPOINT) => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();

  // The query key for the infinite list of posts we need to update.
  const queryKey = ["posts", POST_ENDPOINT];

  const { mutate: repostPost, isPending: isReposting } = useMutation({
    mutationFn: async (postId) => {
      try {
        const response = await fetch(`/api/posts/repost/${postId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Note: It's generally better to handle auth tokens in a centralized API client
            // rather than accessing localStorage in every hook.
            // Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to toggle repost status");
        }
        return data;
      } catch (error) {
        // Ensure the error is properly propagated for onError to catch it.
        throw new Error(error.message || "An unknown error occurred");
      }
    },

    // onMutate runs before the mutation, allowing us to optimistically update the UI.
    onMutate: async (postId) => {
      // 1. Cancel any outgoing refetches so they don't overwrite our optimistic update.
      await queryClient.cancelQueries({ queryKey });

      // 2. Snapshot the previous value.
      const previousPostsData = queryClient.getQueryData(queryKey);

      // 3. Optimistically update to the new value.
      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData || !oldData.pages) return oldData;

        // The updater function to avoid duplicating logic.
        const updatePost = (postToUpdate) => {
          const isReposted = postToUpdate.repostedBy.includes(authUser._id);
          if (isReposted) {
            // Optimistically UNDO the repost
            postToUpdate.repostedBy = postToUpdate.repostedBy.filter(
              (id) => id !== authUser._id
            );
            postToUpdate.repostsCount -= 1;
          } else {
            // Optimistically ADD the repost
            postToUpdate.repostedBy.push(authUser._id);
            postToUpdate.repostsCount += 1;
          }
        };

        // Create a new data structure to ensure we don't mutate the original cache directly.
        const newData = {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) => {
              // The post object in the feed can be the original post or a repost.
              // We need to find the actual original post within the cached data to update it.

              // Case 1: The item in the feed is a repost. Update its 'repostedFrom' object.
              if (post.repostedFrom && post.repostedFrom._id === postId) {
                const newPost = { ...post, repostedFrom: { ...post.repostedFrom } };
                updatePost(newPost.repostedFrom);
                return newPost;
              }

              // Case 2: The item in the feed is the original post itself.
              if (post._id === postId) {
                const newPost = { ...post };
                updatePost(newPost);
                return newPost;
              }

              // Return the post unmodified if it's not the one we're looking for.
              return post;
            }),
          })),
        };

        return newData;
      });

      // 4. Return a context object with the snapshotted value.
      return { previousPostsData };
    },

    // If the mutation fails, use the context returned from onMutate to roll back.
    onError: (err, postId, context) => {
      showAppToast(err.message || "Could not update repost.", "error");
      if (context?.previousPostsData) {
        queryClient.setQueryData(queryKey, context.previousPostsData);
      }
    },

    onSuccess: (data) => {
      showAppToast(data.message || "Success!", "success");
    },

    // onSettled will run after the mutation is complete (whether success or error).
    // This is the perfect place to refetch the data to ensure consistency with the backend.
    onSettled: (data, error, postId) => {
      // Invalidate both the infinite list and the single post query to ensure
      // our cache is eventually consistent with the database.
      // queryClient.invalidateQueries({ queryKey });
      // queryClient.invalidateQueries({ queryKey: ["post", postId] });
    },
  });

  return { repostPost, isReposting };
};

