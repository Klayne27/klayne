import toast from "react-hot-toast";
import { deletePostApi } from "../../api/postsApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useDeletePosts = (post) => {
  const queryClient = useQueryClient();

  const { mutate: deletePost, isPending: isDeleting } = useMutation({
    mutationFn: () => deletePostApi(post),
    onSuccess: () => {
      toast.success("Post deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: () => {
      toast.error("Failed to delete post");
    },
  });

  return { deletePost, isDeleting };
};