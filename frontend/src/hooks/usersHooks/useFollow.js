// hooks/usersHooks/useFollow.js
import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { followApi } from "../../api/usersApi"; // Assuming followApi toggles follow/unfollow
import { useAuthUser } from "../authHooks/useAuthUser";

const useFollow = (user) => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser(); // Assuming this hook provides the current authenticated userr
  const {
    mutate: follow,
    isPending,
    error: followError, // Capture specific error for potential display
  } = useMutation({
    mutationFn: (userIdToFollow) => followApi(userIdToFollow),
    onMutate: async (userIdToFollow) => {
      await queryClient.cancelQueries({ queryKey: ["authUser"] });
      await queryClient.cancelQueries({ queryKey: ["userProfile", userIdToFollow] });
      const previousAuthUser = queryClient.getQueryData(["authUser"]);
      const previousUserProfile = queryClient.getQueryData([
        "userProfile",
        userIdToFollow,
      ]);
      if (previousAuthUser) {
        queryClient.setQueryData(["authUser"], (oldData) => {
          if (!oldData) return oldData; // Should not happen if previousAuthUser exists
          const isCurrentlyFollowing = oldData.following.includes(userIdToFollow);
          let newFollowing;
          if (isCurrentlyFollowing) {
            newFollowing = oldData.following.filter((id) => id !== userIdToFollow);
          } else {
            newFollowing = [...oldData.following, userIdToFollow];
          }
          return { ...oldData, following: newFollowing };
        });
      }
      if (previousUserProfile) {
        queryClient.setQueryData(["userProfile", userIdToFollow], (oldData) => {
          if (!oldData) return oldData; // Should not happen if previousUserProfile exists
          const isCurrentlyFollowedByAuthUser = oldData.followers.includes(authUser._id);
          let newFollowers;
          if (isCurrentlyFollowedByAuthUser) {
            newFollowers = oldData.followers.filter((id) => id !== authUser._id);
          } else {
            newFollowers = [...oldData.followers, authUser._id];
          }
          return { ...oldData, followers: newFollowers };
        });
      }
      return { previousAuthUser, previousUserProfile };
    },
    onError: (error, userIdToFollow, context) => {
      // Rollback to the previous data if the mutation fails
      if (context?.previousAuthUser) {
        queryClient.setQueryData(["authUser"], context.previousAuthUser);
      }
      if (context?.previousUserProfile) {
        queryClient.setQueryData(
          ["userProfile", userIdToFollow],
          context.previousUserProfile
        );
      }
      toast.error(error.message || "Failed to perform action");
    },
    onSettled: (data, error, userIdToFollow) => {
      // Invalidate and refetch to ensure the client state is in sync with the server.
      // This is important because even if optimistic update was correct,
      // the server might have different data due to other actions.
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile", userIdToFollow] });
      queryClient.invalidateQueries({ queryKey: ["followersList", userIdToFollow] });
      // queryClient.invalidateQueries({ queryKey: ["suggestedUsers"] });
    },
    onSuccess: (data, userIdToFollow) => {
      // Optional: Add a success toast
      // const isFollowing = authUser?.following?.includes(userIdToFollow); // This might be stale here
      // const action = isFollowing ? "Unfollowed" : "Followed";
      // toast.success(`${action} user successfully!`);
    },
  });

  return { follow, isPending, followError };
};

export default useFollow;
