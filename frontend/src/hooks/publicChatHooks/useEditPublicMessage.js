import { useMutation, useQueryClient } from "@tanstack/react-query"
import { editPublicMessageApi } from "../../api/publicChatApi"
import { showAppToast } from "../../utils/showAppToast"

export const useEditPublicMessage = () => {
  const queryClient = useQueryClient()

  // The 'mutate' function is returned from useMutation, let's capture it.
  const { mutate: editPublicMessage, isPending: isEditing } = useMutation({
    mutationFn: ({ messageId, newText }) => editPublicMessageApi(messageId, newText),

    onMutate: async ({ messageId, newText }) => {
      // Your onMutate logic is correct for the optimistic update.
      await queryClient.cancelQueries({ queryKey: ["publicMessages"] })
      const previousMessages = queryClient.getQueryData(["publicMessages"])

      queryClient.setQueryData(["publicMessages"], (oldData) => {
        if (!oldData || !oldData.pages) return oldData

        const updatedPages = oldData.pages.map((page) =>
          page.map((message) => {
            if (message._id === messageId) {
              return {
                ...message,
                text: newText,
                isEdited: true,
                // editedAt: new Date().toISOString(),
              }
            }
            return message
          }),
        )
        return { ...oldData, pages: updatedPages }
      })

      return { previousMessages, messageId }
    },

    // ✅ ADDED: A proper onSuccess handler
    onSuccess: (serverMessage, variables, context) => {
      const { messageId } = context

      queryClient.setQueryData(["publicMessages"], (oldData) => {
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
      console.error("Mutation failed:", error) // Log the actual error to the console
      showAppToast(error.message || "Failed to edit message.", "error")
      if (context?.previousMessages) {
        queryClient.setQueryData(["publicMessages"], context.previousMessages)
      }
    },
  })

  // Return the mutation function and its state from your custom hook
  return { editPublicMessage, isEditing }
}
