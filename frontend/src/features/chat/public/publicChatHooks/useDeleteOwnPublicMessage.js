import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteOwnPublicMessageApi } from "../../../../api/publicChatApi"
import { showAppToast } from "../../../../utils/showAppToast"
import { messageKeys } from "../../private/privateChatHooks/messageKeys"

export const useDeleteOwnPublicMessage = () => {
  const queryClient = useQueryClient()
  const queryKey = messageKeys.publicMessages()

  const { mutate: deleteOwnMessage, isPending: isDeletingOwnMessage } = useMutation({
    mutationFn: (messageId) => deleteOwnPublicMessageApi(messageId),
    onMutate: async (messageIdToDelete) => {
      await queryClient.cancelQueries(queryKey)
      const previousMessages = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData) return oldData
        const newPages = oldData.pages.map((page) =>
          page.map((message) => {
            if (message._id === messageIdToDelete) {
              return {
                ...message,
                isDeletedByUser: true,
                text: "[Message Deleted]",
                img: null,
                reactions: [],
                repliedTo: message.repliedTo
                  ? {
                      ...message.repliedTo,
                      text: "",
                      img: null,
                      isOriginalMessageDeleted: true,
                    }
                  : null,
              }
            }
            if (message.repliedTo && message.repliedTo._id === messageIdToDelete) {
              return {
                ...message,
                repliedTo: {
                  ...message.repliedTo,
                  text: "[Message Deleted]",
                  img: null,
                  isDeletedByUser: true,
                  isOriginalMessageDeleted: true,
                },
              }
            }
            return message
          }),
        )
        return { ...oldData, pages: newPages }
      })

      return { previousMessages }
    },
    onError: (err, messageIdToDelete, context) => {
      showAppToast(err.message || "Failed to delete message.", "error")
      if (context?.previousMessages) {
        queryClient.setQueryData(queryKey, context.previousMessages)
      }
    },
  })

  return { deleteOwnMessage, isDeletingOwnMessage }
}
