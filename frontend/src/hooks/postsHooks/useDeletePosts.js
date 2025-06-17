import toast from "react-hot-toast";
import { deletePostApi } from "../../api/postsApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export const useDeletePosts = (post) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate()

  const { mutate: deletePost, isPending: isDeleting } = useMutation({
    mutationFn: () => deletePostApi(post),
    onSuccess: () => {
      toast.success("Post deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post"] });
      navigate("/");
    },
    onError: () => {
      toast.error("Failed to delete post");
    },
  });

  return { deletePost, isDeleting };
};