import { useMutation, useQueryClient } from "@tanstack/react-query"
import { pinMessageApi } from "../../../../api/messagesApi"
import { showAppToast } from "../../../../utils/showAppToast"
import { messageKeys } from "./messageKeys"

export const usePinMessage = () => {
  const queryClient = useQueryClient()
  const { mutate: pinMessage, isPending: isPinningMessage } = useMutation({
    mutationFn: pinMessageApi,
    onSuccess: (data, variables) => {
      showAppToast("Message pinned", "success")
      queryClient.invalidateQueries({ queryKey: messageKeys.pinned(variables.conversationId) })
    },
  })

  return { pinMessage, isPinningMessage }
}
