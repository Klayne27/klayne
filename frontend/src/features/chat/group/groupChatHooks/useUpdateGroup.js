import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateGroupApi } from "../../../../api/groupApi"
import { groupKeys } from "./groupKeys"
import { showAppToast } from "../../../../utils/showAppToast"
import { conversationKeys } from "../../private/privateChatHooks/conversationKeys"

export const useUpdateGroup = (groupId) => {
  const queryClient = useQueryClient()

  const { mutate: updateGroup, isPending: isUpdatingGroup } = useMutation({
    mutationFn: updateGroupApi,
    onSuccess: (updated) => {
      queryClient.setQueryData(groupKeys.detail(groupId), updated)
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
      showAppToast("Group updated.", "success")
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to update group.", "error")
    },
  })

  return { updateGroup, isUpdatingGroup }
}
