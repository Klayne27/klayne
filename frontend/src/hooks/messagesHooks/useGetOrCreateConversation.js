import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getOrCreateConversationApi } from "../../api/messagesApi"
import { showAppToast } from "../../utils/showAppToast"
import { useNavigate } from "react-router-dom"
import { CONVERSATIONS_QUERY_KEY } from "../../constants/queryKeys"

export const useGetOrCreateConversation = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: getOrCreateConversationApi,
    onSuccess: (conversation) => {
      if (conversation && conversation._id) {
        navigate(`/messages/${conversation._id}`)
      } else {
        showAppToast("Failed to open chat: Conversation ID missing.")
      }
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY })
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to open conversation.", "error")
    },
  })
}
