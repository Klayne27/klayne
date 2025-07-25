import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCommentApi } from "../../api/postsApi";
import toast from "react-hot-toast";
import { showAppToast } from "../../utils/showAppToast";

export const useDeleteComment = () => {
  const queryClient = useQueryClient();
  const { mutate: deleteComment, isPending: isDeletingComment } = useMutation({
    mutationFn: deleteCommentApi,
    onSuccess: () => {
      // showAppToast("Comment deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["post"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to delete comment.", "error");
    },
  });

  return { deleteComment, isDeletingComment };
};
