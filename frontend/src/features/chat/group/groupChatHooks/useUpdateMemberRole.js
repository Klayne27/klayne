import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateMemberRoleApi } from "../../../../api/groupApi"
import { groupKeys } from "./groupKeys"
import { showAppToast } from "../../../../utils/showAppToast"

export const useUpdateMemberRole = (groupId) => {
  const queryClient = useQueryClient()

  const { mutate: updateMemberRole, isPending: isUpdatingRole } = useMutation({
    mutationFn: updateMemberRoleApi,
    onSuccess: (updated) => {
      queryClient.setQueryData(groupKeys.detail(groupId), updated)
      queryClient.invalidateQueries({ queryKey: groupKeys.members(groupId) })
      showAppToast("Role updated.", "success")
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to update role.", "error")
    },
  })

  return { updateMemberRole, isUpdatingRole }
}
