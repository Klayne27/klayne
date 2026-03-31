import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getOrCreateConversationApi } from "../../../../api/privateChatApi"
import { useNavigate } from "react-router-dom"
import { conversationKeys } from "./conversationKeys"
import { showAppToast } from "../../../../utils/showAppToast"

export const useGetOrCreateConversation = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { mutate, isPending: isCreatingConversation } = useMutation({
    mutationFn: getOrCreateConversationApi,
    onSuccess: (conversation) => {
      if (conversation?._id) {
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

  const getOrCreateConversation = ({
    existingConversationId,
    targetUserId,
    participantIds,
    name,
  } = {}) => {
    // Group search result — already exists, just navigate
    if (existingConversationId) {
      navigate(`/messages/${existingConversationId}`)
      return
    }
    mutate({ targetUserId, participantIds, name })
  }

  return { getOrCreateConversation, isCreatingConversation }
}
