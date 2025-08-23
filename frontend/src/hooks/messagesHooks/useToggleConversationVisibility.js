import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toggleConversationVisibilityApi } from "../../api/messagesApi"
import { showAppToast } from "../../utils/showAppToast"
import { CONVERSATIONS_QUERY_KEY } from "../../constants/queryKeys"

export const useToggleConversationVisibility = () => {
  const queryClient = useQueryClient()

  const { mutate: toggleVisibility, isPending: isTogglingVisibility } = useMutation({
    mutationFn: ({ conversationId }) => toggleConversationVisibilityApi(conversationId),

    onMutate: async ({ conversationId }) => {
      await queryClient.cancelQueries({ queryKey: CONVERSATIONS_QUERY_KEY })

      const previousConversations = queryClient.getQueryData(CONVERSATIONS_QUERY_KEY)

      if (!previousConversations) {
        return
      }

      queryClient.setQueryData(CONVERSATIONS_QUERY_KEY, (oldData) => {
        if (!Array.isArray(oldData)) {
          return oldData
        }
        return oldData.filter((conv) => conv._id !== conversationId)
      })

      return { previousConversations }
    },

    onError: (err, variables, context) => {
      queryClient.setQueryData(CONVERSATIONS_QUERY_KEY, context.previousConversations)
      showAppToast(err.message || "Failed to hide conversation.", "error")
    },
  })

  return { toggleVisibility, isTogglingVisibility }
}
