import { useMutation, useQueryClient } from "@tanstack/react-query"
import { kickMemberApi } from "../../../../api/groupApi"
import { groupKeys } from "./groupKeys"
import { showAppToast } from "../../../../utils/showAppToast"

export const useKickMember = (groupId) => {
  const queryClient = useQueryClient()

  const { mutate: kickMember, isPending: isKicking } = useMutation({
    mutationFn: kickMemberApi,
    onSuccess: (updated) => {
      queryClient.setQueryData(groupKeys.detail(groupId), updated)
      queryClient.invalidateQueries({ queryKey: groupKeys.members(groupId) })
      showAppToast("Member removed.", "success")
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to kick member.", "error")
    },
  })

  return { kickMember, isKicking }
}
