import { useMutation, useQueryClient } from "@tanstack/react-query"
import { conversationKeys } from "./conversationKeys"
import { deleteConversationApi } from "../../../../api/privateChatApi"
import { showAppToast } from "../../../../utils/showAppToast"

const useDeleteConversation = () => {
  const queryClient = useQueryClient()
  const queryKey = conversationKeys.list()

  const { mutate: deleteConversation, isPending } = useMutation({
    mutationFn: (conversationId) => deleteConversationApi(conversationId),
    onMutate: async (conversationIdToDelete) => {
      await queryClient.cancelQueries({ queryKey: queryKey })

      const previousConversations = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (oldConversations) =>
        oldConversations?.filter((conversation) => conversation._id !== conversationIdToDelete),
      )

      return { previousConversations }
    },
    onSuccess: () => {
      showAppToast("Conversation deleted successfully", "success")
    },
    onError: (error, conversationIdToDelete, context) => {
      showAppToast(`Failed to delete conversation: ${error.message}`, "error")
      queryClient.setQueryData(queryKey, context.previousConversations)
    },
  })

  return { deleteConversation, isPending }
}

export default useDeleteConversation
