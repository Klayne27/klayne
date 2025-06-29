import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { blockUnblockUserApi } from "../../api/usersApi";

export const useBlockUnblockUser = () => {
  const queryClient = useQueryClient();

  const { mutate: blockUnblockUser, isLoading: isBlocking } = useMutation({
    mutationFn: blockUnblockUserApi,
    onSuccess: (data, userIdToBlock) => {
      toast.success(data.message || "User block status updated!");

      // --- CRITICAL: Invalidate relevant queries to refetch fresh data ---
      queryClient.invalidateQueries({ queryKey: ["userProfile", userIdToBlock] });
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["suggestedUsers"] });
      queryClient.invalidateQueries({ queryKey: ["followers"] }); 
      queryClient.invalidateQueries({ queryKey: ["following"] });
      
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update user block status.");
      console.error("Block/Unblock mutation error:", error);
    },
  });

  return { blockUnblockUser, isBlocking };
};
