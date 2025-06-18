import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCommentApi } from "../../api/postsApi";
import toast from "react-hot-toast";

export const useDeleteComment = () => {
  const queryClient = useQueryClient();
  const { mutate: deleteComment, isPending: isDeletingComment } = useMutation({
    mutationFn: deleteCommentApi,
    onSuccess: () => {
      toast.success("Comment deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["post"] }); // Refetch the specific post
      queryClient.invalidateQueries({ queryKey: ["posts"] }); // Invalidate all posts to update feeds
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete comment.");
    },
  });

  return { deleteComment, isDeletingComment };
};
