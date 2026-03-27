import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { createGroupApi } from "../../../../api/groupApi"
import { groupKeys } from "./groupKeys"
import { conversationKeys } from "../../private/privateChatHooks/conversationKeys"
import { showAppToast } from "../../../../utils/showAppToast"

export const useCreateGroup = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { mutate: createGroup, isPending: isCreatingGroup } = useMutation({
    mutationFn: createGroupApi,
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.list() })
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
      showAppToast("Group created!", "success")
      navigate(`/messages/${group._id}`)
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to create group.", "error")
    },
  })

  return { createGroup, isCreatingGroup }
}
