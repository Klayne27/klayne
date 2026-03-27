import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { deleteGroupApi } from "../../../../api/groupApi"
import { groupKeys } from "./groupKeys"
import { conversationKeys } from "../../private/privateChatHooks/conversationKeys"
import { showAppToast } from "../../../../utils/showAppToast"

export const useDeleteGroup = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { mutate: deleteGroup, isPending: isDeletingGroup } = useMutation({
    mutationFn: deleteGroupApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.list() })
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
      showAppToast("Group deleted.", "success")
      navigate("/messages")
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to delete group.", "error")
    },
  })

  return { deleteGroup, isDeletingGroup }
}
