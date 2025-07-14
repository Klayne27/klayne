import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createPostApi } from "../../api/postsApi";

export const useCreatePosts = () => {
  const queryClient = useQueryClient();

  const {
    mutate: createPost,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: (newPostData) => createPostApi(newPostData),
    onSuccess: (data) => {
      // 'data' here is the response from createPostApi
      if (data.isScheduled) {
        toast.success(
          `Post scheduled for ${new Date(data.scheduledAt).toLocaleString()}`
        );
      } else {
        toast.success("Post created successfully");
        queryClient.invalidateQueries({ queryKey: ["posts"] });
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create post");
    },
  });

  return { createPost, isPending, isError, error };
};
