import { useMutation, useQueryClient } from "@tanstack/react-query"
import { joinViaInviteCodeApi } from "../../../../api/groupApi"
import { groupKeys } from "./groupKeys"
import { useNavigate } from "react-router-dom"
import { showAppToast } from "../../../../utils/showAppToast"
import { conversationKeys } from "../../private/privateChatHooks/conversationKeys"

export const useJoinViaInviteCode = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { mutate: joinViaInviteCode, isPending: isJoining } = useMutation({
    mutationFn: joinViaInviteCodeApi,
    onSuccess: (data) => {
      // If private group, it returned a "request sent" message
      if (data.message && !data._id) {
        showAppToast(data.message, "success")
        return
      }
      queryClient.invalidateQueries({ queryKey: groupKeys.list() })
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
      showAppToast("Joined group!", "success")
      navigate(`/messages/${data._id}`)
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to join group.", "error")
    },
  })

  return { joinViaInviteCode, isJoining }
}
