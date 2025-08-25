import { useMutation, useQueryClient } from "@tanstack/react-query";
import { followApi } from "../../api/usersApi";
import { useAuthUser } from "../authHooks/useAuthUser";
import { showAppToast } from "../../utils/showAppToast";
import { conversationKeys } from "../messagesHooks/conversationKeys";

const useFollow = () => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();
  const {
    mutate: follow,
    isPending,
    error: followError,
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
          if (!oldData) return oldData;
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
          if (!oldData) return oldData;
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
      if (context?.previousAuthUser) {
        queryClient.setQueryData(["authUser"], context.previousAuthUser);
      }
      if (context?.previousUserProfile) {
        queryClient.setQueryData(
          ["userProfile", userIdToFollow],
          context.previousUserProfile
        );
      }
      showAppToast(error.message || "Failed to perform action", "error");
    },
    onSettled: (data, error, userIdToFollow) => {
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      queryClient.invalidateQueries({ queryKey: ["followersList", userIdToFollow] });
      queryClient.invalidateQueries({ queryKey: ["followingList", userIdToFollow] });
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() });
      // queryClient.invalidateQueries({ queryKey: ["followedUsersForMessaging"] });
      queryClient.invalidateQueries({
        queryKey: conversationKeys.betweenUsers(userIdToFollow),
      });
      // queryClient.invalidateQueries({ queryKey: ["userProfile", usernameToFolow] });
    },
    onSuccess: (data, userIdToFollow) => {
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
  });

  return { follow, isPending, followError };
};

export default useFollow;
