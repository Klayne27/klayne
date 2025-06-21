import { useQueryClient, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const useRepostPost = () => {
  const queryClient = useQueryClient();

  const { mutate: repostPost, isPending: isReposting } = useMutation({
    mutationFn: async (originalPostId) => {
      const response = await fetch(`/api/posts/repost/${originalPostId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to toggle repost status");
      }
      return data;
    },
    onSuccess: (data, originalPostId) => {
      toast.success(data.message);

      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", originalPostId] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return { repostPost, isReposting };
};
