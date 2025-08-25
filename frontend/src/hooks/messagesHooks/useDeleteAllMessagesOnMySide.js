import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteAllMessagesOnMySide } from "../../api/messagesApi"
import { showAppToast } from "../../utils/showAppToast"
import { messageKeys } from "./messageKeys"
import { conversationKeys } from "./conversationKeys"

const useDeleteAllMessagesOnMySide = () => {
  const queryClient = useQueryClient()

  const { mutateAsync: deleteAllMessages } = useMutation({
    mutationFn: (conversationId) => deleteAllMessagesOnMySide(conversationId),
    onMutate: async (conversationId) => {
      const messagesQueryKey = messageKeys.privateMessages(conversationId)
      const conversationsQueryKey = conversationKeys.list()

      await queryClient.cancelQueries({ queryKey: messagesQueryKey })
      await queryClient.cancelQueries({ queryKey: conversationsQueryKey })

      const previousMessages = queryClient.getQueryData(messagesQueryKey)
      const previousConversations = queryClient.getQueryData(conversationsQueryKey)

      queryClient.setQueryData(messagesQueryKey, {
        pages: [[]],
        pageParams: [undefined],
      })

      queryClient.setQueryData(conversationsQueryKey, (oldData) => {
        if (!oldData) return oldData
        return oldData.map((conversation) => {
          if (conversation._id === conversationId) {
            return { ...conversation, lastMessage: null }
          }
          return conversation
        })
      })

      // Step 4: Return snapshots in the context
      return { previousMessages, previousConversations, conversationId }
    },
    onSuccess: (data) => {
      showAppToast(data.message, "success")
    },
    onError: (error, variables, context) => {
      showAppToast(error.message, "error")

      queryClient.setQueryData(
        messageKeys.privateMessages(context.conversationId),
        context.previousMessages,
      )
      queryClient.setQueryData(conversationKeys.list(), context.previousConversations)
    },
  })

  return { deleteAllMessages }
}

export default useDeleteAllMessagesOnMySide
