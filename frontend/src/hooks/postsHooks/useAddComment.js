// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import { addCommentApi } from "../../api/postsApi";
// import toast from "react-hot-toast";

// export const useAddComment = (pid) => {
//   const queryClient = useQueryClient();
//   const { mutate: addComment, isPending: isAddingComment } = useMutation({
//     mutationFn: addCommentApi,
//     onSuccess: () => {
//       toast.success("Comment added successfully!");
//       queryClient.invalidateQueries(["post", pid]);
//       queryClient.invalidateQueries(["posts"]);
//     },
//     onError: (err) => {
//       toast.error(err.message || "Failed to add comment.");
//     },
//   });

//   return {addComment, isAddingComment}
// };
