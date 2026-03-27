import { useQuery } from "@tanstack/react-query"
import { getMembersApi } from "../../../../api/groupApi"
import { groupKeys } from "./groupKeys"

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
