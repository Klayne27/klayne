import { useMutation, useQueryClient } from "@tanstack/react-query";
import { commentPostApi } from "../../api/postsApi";
import toast from "react-hot-toast";

export const useCommentPost = (post, comment, setComment) => {
  const queryClient = useQueryClient();

  const { mutate: commentPost, isPending: isCommenting } = useMutation({
    mutationFn: () => commentPostApi(post, comment),
    onSuccess: () => {
      toast.success("Comment posted successfully");
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return { commentPost, isCommenting };
};
