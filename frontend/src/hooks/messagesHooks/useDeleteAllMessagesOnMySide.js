import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteAllMessagesOnMySide } from "../../api/messagesApi"
import { showAppToast } from "../../utils/showAppToast"

const useDeleteAllMessagesOnMySide = () => {
  const queryClient = useQueryClient()

  const { mutateAsync: deleteAllMessages } = useMutation({
    mutationFn: (conversationId) => deleteAllMessagesOnMySide(conversationId),
    onMutate: async (conversationId) => {
      // Cancel any ongoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["messages", conversationId] }) // Snapshot the previous value

      const previousMessages = queryClient.getQueryData(["messages", conversationId]) // Optimistically update to a new value (empty pages array)

      queryClient.setQueryData(["messages", conversationId], {
        pages: [[]],
        pageParams: [undefined],
      })

      // We also optimistically update the conversation list to remove the message preview
      // (This part is optional but a good practice for a full optimistic update)
      queryClient.setQueryData(["conversations"], (oldData) => {
        if (!oldData) return oldData

        return oldData.map((conversation) => {
          if (conversation._id === conversationId) {
            return { ...conversation, lastMessage: null }
          }
          return conversation
        })
      }) // Return a context object with the snapshot value

      return { previousMessages, conversationId }
    },
    onSuccess: (data) => {
      showAppToast(data.message, "success") // Invalidate conversations to get the latest list from the server

      queryClient.invalidateQueries({ queryKey: ["conversations"] })
    },
    onError: (error, variables, context) => {
      showAppToast(error.message, "error") // If the mutation fails, use the context to roll back

      queryClient.setQueryData(["messages", context.conversationId], context.previousMessages) // Also roll back the conversations list
      queryClient.setQueryData(["conversations"], (oldData) => {
        if (!oldData) return oldData

        return oldData.map((conversation) => {
          if (conversation._id === context.conversationId) {
            return { ...conversation, lastMessage: context.previousMessages.pages[0][0] }
          }
          return conversation
        })
      })
    },
    onSettled: (data, error, variables) => {
      // On both success and failure, invalidate to ensure a fresh state
      queryClient.invalidateQueries({ queryKey: ["messages", variables] })
    },
  })

  return { deleteAllMessages }
}

export default useDeleteAllMessagesOnMySide
