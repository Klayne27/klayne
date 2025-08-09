import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getOrCreateConversationApi } from "../../api/messagesApi"
import { showAppToast } from "../../utils/showAppToast"
import { useNavigate } from "react-router-dom"

export const useGetOrCreateConversation = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: getOrCreateConversationApi,
    onSuccess: (conversation) => {
      if (conversation && conversation._id) {
        navigate(`/messages/${conversation._id}`)
        // queryClient.invalidateQueries({ queryKey: ["conversations"] })
      } else {
        showAppToast("Failed to open chat: Conversation ID missing.")
      }
      queryClient.invalidateQueries({ queryKey: ["conversations"] })
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to open conversation.", "error")
    },
  })
}
