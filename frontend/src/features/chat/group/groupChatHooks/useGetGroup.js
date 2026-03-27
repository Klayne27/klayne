import { useQuery } from "@tanstack/react-query"
import { getGroupApi } from "../../../../api/groupApi"
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
