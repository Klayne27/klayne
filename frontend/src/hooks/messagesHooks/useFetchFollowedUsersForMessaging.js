import { useQuery } from "@tanstack/react-query";
import { fetchFollowedUsersForMessagingApi } from "../../api/messagesApi";

export const useFetchFollowedUsersForMessaging = () => {
  const {
    data: followedUsers = [],
    isLoading: isLoadingFollowedUsers,
    error: errorFollowedUsers,
  } = useQuery({
    queryKey: ["followedUsersForMessaging"],
    queryFn: fetchFollowedUsersForMessagingApi,
  });

  return { followedUsers, isLoadingFollowedUsers, errorFollowedUsers };
};
