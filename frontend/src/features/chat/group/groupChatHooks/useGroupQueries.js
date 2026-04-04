import { useQuery } from "@tanstack/react-query"
import { getGroupApi, getJoinRequestsApi, getMembersApi } from "../../../../api/groupApi"
import { groupKeys } from "./groupKeys"

export const useGetGroup = (groupId) => {
  const {
    data: group,
    isLoading,
    error,
  } = useQuery({
    queryKey: groupKeys.detail(groupId),
    queryFn: () => getGroupApi(groupId),
    enabled: !!groupId,
    staleTime: 2 * 60 * 1000,
  })
  return { group, isLoading, error }
}

export const useGetJoinRequests = (groupId) => {
  const { data: joinRequests = [], isLoading } = useQuery({
    queryKey: groupKeys.joinRequests(groupId),
    queryFn: () => getJoinRequestsApi(groupId),
    enabled: !!groupId,
  })

  return { joinRequests, isLoading }
}

export const useGetMembers = ({ groupId, search = "", page = 1 }) => {
  const { data, isLoading } = useQuery({
    queryKey: [...groupKeys.members(groupId), search, page],
    queryFn: () => getMembersApi({ groupId, search, page }),
    enabled: !!groupId,
    keepPreviousData: true,
  })

  return {
    members: data?.members || [],
    total: data?.total || 0,
    hasNextPage: data?.hasNextPage || false,
    isLoading,
  }
}
