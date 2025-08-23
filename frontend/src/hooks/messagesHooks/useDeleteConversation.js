import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteConversationApi } from "../../api/messagesApi"
import { showAppToast } from "../../utils/showAppToast"
import { CONVERSATIONS_QUERY_KEY } from "../../constants/queryKeys"

const useDeleteConversation = () => {
  const queryClient = useQueryClient()

  const { mutate: deleteConversation, isPending } = useMutation({
    mutationFn: (conversationId) => deleteConversationApi(conversationId),
    onMutate: async (conversationIdToDelete) => {
      await queryClient.cancelQueries({ queryKey: CONVERSATIONS_QUERY_KEY })

      const previousConversations = queryClient.getQueryData(CONVERSATIONS_QUERY_KEY)

      queryClient.setQueryData(CONVERSATIONS_QUERY_KEY, (oldConversations) =>
        oldConversations?.filter((conversation) => conversation._id !== conversationIdToDelete),
      )

      return { previousConversations }
    },
    onSuccess: () => {
      showAppToast("Conversation deleted successfully", "success")
    },
    onError: (error, conversationIdToDelete, context) => {
      showAppToast(`Failed to delete conversation: ${error.message}`, "error")
      queryClient.setQueryData(CONVERSATIONS_QUERY_KEY, context.previousConversations)
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY })
    },
  })

  return { deleteConversation, isPending }
}

export default useDeleteConversation
