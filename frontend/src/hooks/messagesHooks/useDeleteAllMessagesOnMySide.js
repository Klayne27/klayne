import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteAllMessagesOnMySide } from "../../api/messagesApi"
import { showAppToast } from "../../utils/showAppToast"
import { CONVERSATIONS_QUERY_KEY } from "../../constants/queryKeys"

const useDeleteAllMessagesOnMySide = () => {
  const queryClient = useQueryClient()

  const { mutateAsync: deleteAllMessages } = useMutation({
    mutationFn: (conversationId) => deleteAllMessagesOnMySide(conversationId),
    onMutate: async (conversationId) => {
      await queryClient.cancelQueries({ queryKey: ["messages", conversationId] }) // Snapshot the previous value

      const previousMessages = queryClient.getQueryData(["messages", conversationId]) // Optimistically update to a new value (empty pages array)

      queryClient.setQueryData(["messages", conversationId], {
        pages: [[]],
        pageParams: [undefined],
      })

      queryClient.setQueryData(CONVERSATIONS_QUERY_KEY, (oldData) => {
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
      showAppToast(data.message, "success")
      // queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY })
    },
    onError: (error, variables, context) => {
      showAppToast(error.message, "error") 

      queryClient.setQueryData(["messages", context.conversationId], context.previousMessages)
      queryClient.setQueryData(CONVERSATIONS_QUERY_KEY, (oldData) => {
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
      queryClient.invalidateQueries({ queryKey: ["messages", variables] })
    },
  })

  return { deleteAllMessages }
}

export default useDeleteAllMessagesOnMySide
