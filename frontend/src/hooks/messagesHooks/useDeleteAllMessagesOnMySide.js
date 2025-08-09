import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteAllMessagesOnMySide } from "../../api/messagesApi"
import { showAppToast } from "../../utils/showAppToast"

const useDeleteAllMessagesOnMySide = () => {
  const queryClient = useQueryClient()

  const { mutateAsync: deleteAllMessages, isPending: isDeleting } = useMutation({
    mutationFn: (conversationId) => deleteAllMessagesOnMySide(conversationId),
    onSuccess: (data) => {
      showAppToast(data.message, "success")

      queryClient.invalidateQueries({ queryKey: ["conversations"] })
      queryClient.setQueryData(["messages", data.conversationId], {
        pages: [[]],
        pageParams: [undefined],
      })
    },
    onError: (error) => {
      showAppToast(error.message, "error")
    },
  })

  return { deleteAllMessages, isDeleting }
}

export default useDeleteAllMessagesOnMySide
