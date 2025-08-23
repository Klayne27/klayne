import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCommentApi } from "../../api/postsApi";
import { showAppToast } from "../../utils/showAppToast";
import { POSTS_QUERY_KEY } from "../../constants/queryKeys";

export const useDeleteComment = () => {
  const queryClient = useQueryClient();
  const { mutate: deleteComment, isPending: isDeletingComment } = useMutation({
    mutationFn: deleteCommentApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY });
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to delete comment.", "error");
    },
  });

  return { deleteComment, isDeletingComment };
};
