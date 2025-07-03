import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createPostApi } from "../../api/postsApi";

// --- MODIFIED: Remove text, img parameters from hook ---
export const useCreatePosts = () => {
  const queryClient = useQueryClient();

  const {
    mutate: createPost, // The `mutate` function will now receive the object { text, img, video }
    isPending,
    isError,
    error,
  } = useMutation({
    // --- MODIFIED: Pass the received variables directly to createPostApi ---
    mutationFn: (newPostData) => createPostApi(newPostData), // newPostData will be { text, img, video }
    // --- END MODIFIED ---
    onSuccess: () => {
      toast.success("Post created successfully");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error) => {
      // It's good to show the specific error message to the user
      toast.error(error.message || "Failed to create post");
    },
  });

  return { createPost, isPending, isError, error };
};
