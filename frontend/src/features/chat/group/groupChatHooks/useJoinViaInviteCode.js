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
      // --- PRIVATE GROUP CASE ---
      if (data.message && !data._id) {
        showAppToast(data.message, "success")
        // Navigate away so the user isn't stuck on the loading page
        navigate("/messages") 
        return
      }

      // --- PUBLIC GROUP CASE ---
      queryClient.invalidateQueries({ queryKey: groupKeys.list() })
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
      showAppToast("Joined group!", "success")
      navigate(`/messages/${data._id}`)
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to join group.", "error")
      // Also navigate away on error so they aren't stuck
      navigate("/messages")
    },
  })

  return { joinViaInviteCode, isJoining }
}
