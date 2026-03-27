import { useMutation, useQueryClient } from "@tanstack/react-query"
import { adminDeleteMessageApi } from "../../../../api/groupApi"
import { messageKeys } from "../../private/privateChatHooks/messageKeys"
import { showAppToast } from "../../../../utils/showAppToast"

export const useAdminDeleteMessage = (groupId) => {
  const queryClient = useQueryClient()

  const { mutate: adminDeleteMessage, isPending: isDeletingAsAdmin } = useMutation({
    mutationFn: adminDeleteMessageApi,
    onMutate: async ({ messageId }) => {
      await queryClient.cancelQueries({ queryKey: messageKeys.privateMessages(groupId) })
      const previous = queryClient.getQueryData(messageKeys.privateMessages(groupId))

      queryClient.setQueryData(messageKeys.privateMessages(groupId), (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((msg) => (msg._id === messageId ? { ...msg, isDeletedByAdmin: true } : msg)),
          ),
        }
      })

      return { previous }
    },
    onError: (error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(messageKeys.privateMessages(groupId), context.previous)
      }
      showAppToast(error.message || "Failed to delete message.", "error")
    },
    onSuccess: () => {
      showAppToast("Message deleted.", "success")
    },
  })

  return { adminDeleteMessage, isDeletingAsAdmin }
}
