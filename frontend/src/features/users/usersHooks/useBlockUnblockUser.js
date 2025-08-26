import { useMutation, useQueryClient } from "@tanstack/react-query"
import { userKeys } from "./userKeys"
import { blockUnblockUserApi } from "../../../api/usersApi"
import { showAppToast } from "../../../utils/showAppToast"
import { postKeys } from "../../posts/postsHooks/postKeys"
import { conversationKeys } from "../../chat/private/privateChatHooks/conversationKeys"
import { messageKeys } from "../../chat/private/privateChatHooks/messageKeys"
import { notificationKeys } from "../../notifications/notificationsHooks/notificationKeys"

export const useBlockUnblockUser = () => {
  const queryClient = useQueryClient()

  const { mutate: blockUnblockUser, isLoading: isBlocking } = useMutation({
    mutationFn: blockUnblockUserApi,
    onSuccess: (data, variables) => {
      showAppToast(data.message || "User block status updated!", "success")

      const targetUserId = variables

      queryClient.setQueryData(userKeys.auth(), (oldAuthUser) => {
        if (!oldAuthUser) return oldAuthUser

        const isCurrentlyBlockedByAuthUser = oldAuthUser.blockedUsers?.includes(targetUserId)

        let newBlockedUsers
        if (isCurrentlyBlockedByAuthUser) {
          newBlockedUsers = oldAuthUser.blockedUsers.filter((id) => id !== targetUserId)
        } else {
          newBlockedUsers = [...(oldAuthUser.blockedUsers || []), targetUserId]
        }

        return {
          ...oldAuthUser,
          blockedUsers: newBlockedUsers,
        }
      })

      if (data.username) {
        queryClient.setQueryData(userKeys.profile(data.username), (oldData) => {
          return {
            ...oldData,
            user: oldData?.user,
            isBlockedByYou: data.isBlockedByYou,
            hasBlockedYou: data.hasBlockedYou,
            message: data.message,
            status: 200,
          }
        })
      }

      if (data.username) {
        queryClient.invalidateQueries({ queryKey: userKeys.profile(data.username) })
      } else {
        console.warn(
          "API response for block/unblock did not contain the affected username for userProfile invalidation.",
        )
      }

      queryClient.invalidateQueries({ queryKey: userKeys.auth() })
      queryClient.invalidateQueries({ queryKey: postKeys.all })
      queryClient.invalidateQueries({ queryKey: ["comments"] })
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() })
      queryClient.invalidateQueries({ queryKey: userKeys.suggestedList() })
      // queryClient.invalidateQueries({ queryKey: ["followers"] })
      // queryClient.invalidateQueries({ queryKey: ["following"] })
      queryClient.invalidateQueries({ queryKey: messageKeys.private() })
    },
    onError: (error) => {
      showAppToast(error.message || "Failed to update user block status.", "error")
      console.error("Block/Unblock mutation error:", error)
    },
  })

  return { blockUnblockUser, isBlocking }
}
