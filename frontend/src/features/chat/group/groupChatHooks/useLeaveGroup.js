import { useMutation, useQueryClient } from "@tanstack/react-query"
import { leaveGroupApi } from "../../../../api/groupApi"
import { groupKeys } from "./groupKeys"
import { useNavigate } from "react-router-dom"
import { showAppToast } from "../../../../utils/showAppToast"
import { conversationKeys } from "../../private/privateChatHooks/conversationKeys"

export const useLeaveGroup = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { mutate: leaveGroup, isPending: isLeavingGroup } = useMutation({
    mutationFn: leaveGroupApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.list() })
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
      showAppToast("You left the group.", "success")
      navigate("/messages")
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to leave group.", "error")
    },
  })

  return { leaveGroup, isLeavingGroup }
}
