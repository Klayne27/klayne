// hooks/postsHooks/useDeletePosts.js (Ensure it matches the one from my last response)
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { deletePostApi } from "../../api/postsApi"; // Make sure this import is correct
import { showAppToast } from "../../utils/showAppToast";

export const useDeletePosts = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { mutate: deletePost, isPending: isDeleting } = useMutation({
    mutationFn: (postIdToDelete) => deletePostApi(postIdToDelete), // This expects postIdToDelete directly

    onMutate: async (postIdToDelete) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      await queryClient.cancelQueries({ queryKey: ["post", postIdToDelete] });

      const previousPostsPages = queryClient.getQueryData(["posts"]);
      const previousSinglePost = queryClient.getQueryData(["post", postIdToDelete]);

      queryClient.setQueryData(["posts"], (oldData) => {
        if (!oldData) return oldData;
        const newPages = oldData.pages.map((page) => ({
          ...page,
          posts: page.posts.filter((p) => p._id !== postIdToDelete),
        }));
        const newTotalPosts =
          oldData.pages[0]?.totalPosts > 0 ? oldData.pages[0]?.totalPosts - 1 : 0;
        if (newPages[0]) {
          newPages[0].totalPosts = newTotalPosts;
        }
        return {
          ...oldData,
          pages: newPages,
        };
      });

      queryClient.setQueryData(["post", postIdToDelete], null);
      navigate("/");
      return { previousPostsPages, previousSinglePost };
    },

    onSuccess: () => {
      showAppToast("Post deleted successfully!", "success");
    },

    onError: (error, postIdToDelete, context) => {
      showAppToast(`Failed to delete post: ${error.message}`, "error");
      if (context?.previousPostsPages) {
        queryClient.setQueryData(["posts"], context.previousPostsPages);
      }
      if (context?.previousSinglePost) {
        queryClient.setQueryData(["post", postIdToDelete], context.previousSinglePost);
      }
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", postIdToDelete] });
    },

    onSettled: (data, error, postIdToDelete) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", postIdToDelete] });
    },
  });

  return { deletePost, isDeleting };
};
