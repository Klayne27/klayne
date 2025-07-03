import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toggleBookmarkApi } from "../../api/postsApi";
import toast from "react-hot-toast";

export const useToggleBookmarks = () => {
  const queryClient = useQueryClient();

  const { mutate: toggleBookmark, isPending: isBookmarking } = useMutation({
    mutationFn: toggleBookmarkApi,
    onSuccess: (data) => {
      toast.success(data.message);

      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarkedPosts"] });
      queryClient.invalidateQueries({ queryKey: ["post"] });
    },
    onError: (error) => {
      console.error("Error toggling bookmark: ", error);
      toast.error(error.message || "Failed to toggle bookmark");
    },
  });

  return { toggleBookmark, isBookmarking };
};
