import { useMutation, useQueryClient } from "@tanstack/react-query"
import { messageKeys } from "./messageKeys"
import { conversationKeys } from "./conversationKeys"
import { editMessageApi } from "../../../../api/messagesApi"
import { showAppToast } from "../../../../utils/showAppToast"

export const useEditMessage = (conversationId) => {
  const queryClient = useQueryClient()

  const { mutate: editPrivateMessage, isPending: isEditing } = useMutation({
    mutationFn: ({ messageId, newText }) => editMessageApi(messageId, newText),
    onMutate: async ({ messageId, newText }) => {
      const messagesQueryKey = messageKeys.privateMessages(conversationId)
      const conversationQueryKey = conversationKeys.list()

      await queryClient.cancelQueries({ queryKey: messagesQueryKey })

      const previousMessagesData = queryClient.getQueryData(messagesQueryKey)

      queryClient.setQueryData(messagesQueryKey, (oldData) => {
        if (!oldData || !oldData.pages) return oldData

        const updatedPages = oldData.pages.map((page) =>
          page.map((msg) =>
            msg._id === messageId
              ? {
                  ...msg,
                  text: newText,
                  isEdited: true,
                }
              : msg,
          ),
        )

        return { ...oldData, pages: updatedPages }
      })

      queryClient.setQueryData(conversationQueryKey, oldData => {
        if(!oldData) return oldData

        return oldData
      })



      return { previousMessagesData, messagesQueryKey }
    },
    onError: (error, variables, context) => {
      showAppToast("Failed to update message: " + error.message, "error")
      queryClient.setQueryData(context.messagesQueryKey, context.previousMessagesData)
    },
  })

  return { editPrivateMessage, isEditing }
}
