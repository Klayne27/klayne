import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getOrCreateConversationApi } from "../../api/messagesApi"
import { showAppToast } from "../../utils/showAppToast"
import { useNavigate } from "react-router-dom"
import { conversationKeys } from "./conversationKeys"

export const useGetOrCreateConversation = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { mutate: getOrCreateConversation, isPending: isCreatingConversation }= useMutation({
    mutationFn: getOrCreateConversationApi,
    onSuccess: (conversation) => {
      if (conversation && conversation._id) {
        navigate(`/messages/${conversation._id}`)
      } else {
        showAppToast("Failed to open chat: Conversation ID missing.")
      }
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to open conversation.", "error")
    },
  })

  return {getOrCreateConversation, isCreatingConversation}
}
