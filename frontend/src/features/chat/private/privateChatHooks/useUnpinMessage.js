import { useMutation, useQueryClient } from "@tanstack/react-query"
import { unpinMessageApi } from "../../../../api/privateChatApi" // You'll need to create this
import { showAppToast } from "../../../../utils/showAppToast"
import { messageKeys } from "./messageKeys"

export const useUnpinMessage = () => {
  const queryClient = useQueryClient()

  const { mutate: unpinMessage, isPending: isUnpinning } = useMutation({
    mutationFn: unpinMessageApi,
    onSuccess: (data, variables) => {
      showAppToast("Message unpinned", "success")

      // Update the pinned messages cache
      queryClient.setQueryData(messageKeys.pinned(variables.conversationId), (oldData) => {
        if (!oldData) return []

        // Remove the unpinned message
        return oldData.filter(
          (pin) =>
            pin &&
            pin.message &&
            pin.message._id !== variables.messageId &&
            pin.message !== variables.messageId,
        )
      })

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({
        queryKey: messageKeys.pinned(variables.conversationId),
      })
    },
    onError: (error, variables) => {
      console.error("Failed to unpin message:", error)
      showAppToast(error?.message || "Failed to unpin message", "error")
    },
  })

  return { unpinMessage, isUnpinning }
}
