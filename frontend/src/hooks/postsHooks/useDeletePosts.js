import toast from "react-hot-toast";
import { deletePostApi } from "../../api/postsApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { showAppToast } from "../../utils/showAppToast";

export const useDeletePosts = (post) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate()

  const { mutate: deletePost, isPending: isDeleting } = useMutation({
    mutationFn: () => deletePostApi(post),
    onSuccess: () => {
      showAppToast("Post deleted successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post"] });
      navigate("/");
    },
    onError: () => {
      showAppToast("Failed to delete post", "error");
    },
  });

  return { deletePost, isDeleting };
};