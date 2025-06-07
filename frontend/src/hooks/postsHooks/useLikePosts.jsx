import { useMutation, useQueryClient } from "@tanstack/react-query";
import { likePostApi } from "../../api/postsApi";
import toast from "react-hot-toast";

export const useLikePost = (post) => {
  const queryClient = useQueryClient();

  const { mutate: likePost, isPending: isLiking } = useMutation({
    mutationFn: () => likePostApi(post),
    onSuccess: (updatedLikes) => {
      // this is not the best UX, bc it will refetch all posts
      // queryClient.invalidateQueries({ queryKey: ["posts"] });

      // instead, update the cahce directly for that post
      queryClient.setQueryData(["posts"], (oldData) => {
        return oldData.map((p) => {
          if (p._id === post._id) {
            return { ...p, likes: updatedLikes };
          }
          return p;
        });
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {likePost, isLiking}
};
