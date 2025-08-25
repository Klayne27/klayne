import { useMutation, useQueryClient } from "@tanstack/react-query"
import { messageKeys } from "./messageKeys"
import { useAuthUser } from "../../../auth/authHooks/useAuthUser"
import { reactToMessageApi } from "../../../../api/messagesApi"
import { showAppToast } from "../../../../utils/showAppToast"

export const useReactToMessage = ({ selectedConversationId, onReactionAdded }) => {
  const queryClient = useQueryClient()
  const { authUser: currentUser } = useAuthUser()

  const { mutate: reactToMessage } = useMutation({
    mutationFn: ({ messageId, emoji }) => reactToMessageApi(messageId, emoji),

    onMutate: async ({ messageId, emoji }) => {
      await queryClient.cancelQueries({ queryKey: messageKeys.privateMessages(selectedConversationId) })
      const previousMessages = queryClient.getQueryData(messageKeys.privateMessages(selectedConversationId))

      queryClient.setQueryData(messageKeys.privateMessages(selectedConversationId), (oldData) => {
        if (!oldData || !currentUser) return oldData
        const userId = currentUser._id
        const updatedPages = oldData.pages.map((page) =>
          page.map((message) => {
            if (message._id === messageId) {
              const newReactions = [...message.reactions]
              const existingReactionIndex = newReactions.findIndex(
                (r) =>
                  (r.userId?._id || r.userId)?.toString() === userId.toString() &&
                  r.emoji === emoji,
              )

              if (existingReactionIndex !== -1) {
                newReactions.splice(existingReactionIndex, 1)
              } else {
                newReactions.push({
                  _id: `optimistic-${Date.now()}-${userId}-${emoji}`,
                  emoji: emoji,
                  userId: {
                    _id: userId,
                    username: currentUser.username,
                    fullName: currentUser.fullName,
                    profileImg: currentUser.profileImg,
                  },
                })
              }
              return { ...message, reactions: newReactions }
            }
            return message
          }),
        )
        return { ...oldData, pages: updatedPages }
      })

      if (onReactionAdded) {
        onReactionAdded(messageId)
      }

      return { previousMessages }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(messageKeys.privateMessages(selectedConversationId), context.previousMessages)
      showAppToast(err.message || "Failed to react.", "error")
    },
  })

  return { reactToMessage }
}
