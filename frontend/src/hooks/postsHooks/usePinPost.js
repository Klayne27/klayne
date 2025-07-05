import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { pinUnpinPostApi, unpinPostApi } from "../../api/postsApi";

export const usePinPost = () => {
  const queryClient = useQueryClient();

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
    onSuccess: (data, variables) => {
      toast.success(data.message);

      const { postId, action, username } = variables; 

      queryClient.invalidateQueries({ queryKey: ["pinnedPosts", username] });
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update pin status");
    },
  });

  return { pinUnpinPost, isPinning, isError, error };
};
