import toast from "react-hot-toast";
import { deletePostApi } from "../../api/postsApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { showAppToast } from "../../utils/showAppToast";
import { POSTS_QUERY_KEY } from "../../constants/queryKeys";

export const useDeletePosts = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const { mutate: deletePost, isPending: isDeleting } = useMutation({
    mutationFn: (postId) => deletePostApi(postId),
    onSuccess: () => {
      showAppToast("Post deleted successfully", "success");
      queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["post"] });
      pathname.includes("/post/") ? navigate(-1) : "";
    },
    onError: () => {
      showAppToast("Failed to delete post", "error");
    },
  });

  return { deletePost, isDeleting };
};
