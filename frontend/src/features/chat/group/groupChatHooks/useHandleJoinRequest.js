import { useMutation, useQueryClient } from "@tanstack/react-query"
import { handleJoinRequestApi } from "../../../../api/groupApi"
import { groupKeys } from "./groupKeys"
import { showAppToast } from "../../../../utils/showAppToast"

export const useHandleJoinRequest = (groupId) => {
  const queryClient = useQueryClient()

  const { mutate: handleJoinRequest, isPending } = useMutation({
    mutationFn: handleJoinRequestApi,
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.joinRequests(groupId) })
      queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) })
      showAppToast(action === "approve" ? "Request approved." : "Request rejected.", "success")
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to handle request.", "error")
    },
  })

  return { handleJoinRequest, isPending }
}
