import { useMutation, useQueryClient } from "@tanstack/react-query"
import { editPublicMessageApi } from "../../api/publicChatApi"
import { showAppToast } from "../../utils/showAppToast"
import { messageKeys } from "../messagesHooks/messageKeys"

export const useEditPublicMessage = () => {
  const queryClient = useQueryClient()
  const queryKey = messageKeys.publicMessages()

  const { mutate: editPublicMessage, isPending: isEditing } = useMutation({
    mutationFn: ({ messageId, newText }) => editPublicMessageApi(messageId, newText),

    onMutate: async ({ messageId, newText }) => {
      await queryClient.cancelQueries({ queryKey: queryKey })
      const previousMessages = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData || !oldData.pages) return oldData

        const updatedPages = oldData.pages.map((page) =>
          page.map((message) => {
            if (message._id === messageId) {
              return {
                ...message,
                text: newText,
                isEdited: true,
              }
            }
            return message
          }),
        )
        return { ...oldData, pages: updatedPages }
      })

      return { previousMessages, messageId }
    },

    onSuccess: (serverMessage, variables, context) => {
      const { messageId } = context

      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData || !oldData.pages) return oldData
        const updatedPages = oldData.pages.map((page) =>
          page.map((message) =>
            // The messageId in this comparison is the correct, permanent ID.
            message._id === messageId ? serverMessage : message,
          ),
        )
        return { ...oldData, pages: updatedPages }
      })
    },

    onError: (error, variables, context) => {
      showAppToast(error.message || "Failed to edit message.", "error")
      queryClient.setQueryData(queryKey, context.previousMessages)
    },
  })

  // Return the mutation function and its state from your custom hook
  return { editPublicMessage, isEditing }
}
