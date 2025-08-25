import { useMutation, useQueryClient } from "@tanstack/react-query"
import { conversationKeys } from "./conversationKeys"
import { toggleConversationVisibilityApi } from "../../../../api/messagesApi"
import { showAppToast } from "../../../../utils/showAppToast"

export const useToggleConversationVisibility = () => {
  const queryClient = useQueryClient()

  const { mutate: toggleVisibility, isPending: isTogglingVisibility } = useMutation({
    mutationFn: ({ conversationId }) => toggleConversationVisibilityApi(conversationId),

    onMutate: async ({ conversationId }) => {
      await queryClient.cancelQueries({ queryKey: conversationKeys.list() })

      const previousConversations = queryClient.getQueryData(conversationKeys.list())

      if (!previousConversations) {
        return
      }

      queryClient.setQueryData(conversationKeys.list(), (oldData) => {
        if (!Array.isArray(oldData)) {
          return oldData
        }
        return oldData.filter((conv) => conv._id !== conversationId)
      })

      return { previousConversations }
    },

    onError: (err, variables, context) => {
      queryClient.setQueryData(conversationKeys.list(), context.previousConversations)
      showAppToast(err.message || "Failed to hide conversation.", "error")
    },
  })

  return { toggleVisibility, isTogglingVisibility }
}
