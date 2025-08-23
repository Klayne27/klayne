import { useMutation, useQueryClient } from "@tanstack/react-query"
import { editMessageApi } from "../../api/messagesApi"
import { showAppToast } from "../../utils/showAppToast"

export const useEditMessage = (conversationId) => {
  const queryClient = useQueryClient()

  const { mutate: editPrivateMessage, isPending: isEditing } = useMutation({
    mutationFn: ({ messageId, newText }) => editMessageApi(messageId, newText),
    onMutate: async ({ messageId, newText }) => {
      const queryKey = ["messages", conversationId]

      await queryClient.cancelQueries({ queryKey: queryKey })

      const previousMessagesData = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (oldData) => {
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

      return { previousMessagesData, queryKey }
    },
    onError: (error, variables, context) => {
      showAppToast("Failed to update message: " + error.message, "error")
      queryClient.setQueryData(context.queryKey, context.previousMessagesData)
    },
  })

  return { editPrivateMessage, isEditing }
}
