import { useQuery } from "@tanstack/react-query"
import { getJoinRequestsApi } from "../../../../api/groupApi"
import { groupKeys } from "./groupKeys"

export const useGetJoinRequests = (groupId) => {
  const { data: joinRequests = [], isLoading } = useQuery({
    queryKey: groupKeys.joinRequests(groupId),
    queryFn: () => getJoinRequestsApi(groupId),
    enabled: !!groupId,
  })

  return { joinRequests, isLoading }
}
