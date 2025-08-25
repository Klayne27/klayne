import { useMutation, useQueryClient } from "@tanstack/react-query"
import { messageKeys } from "../../private/privateChatHooks/messageKeys"
import { useAuthUser } from "../../../auth/authHooks/useAuthUser"
import { addPublicMessageReactionApi } from "../../../../api/publicChatApi"

export const useAddPublicMessageReaction = ({ onReactionAdded }) => {
  const queryClient = useQueryClient()
  const { authUser: currentUser } = useAuthUser()
  const queryKey = messageKeys.publicMessages()

  const { mutate: addReaction, isPending: isReacting } = useMutation({
    mutationFn: ({ messageId, emoji }) => addPublicMessageReactionApi(messageId, emoji),
    onMutate: async ({ messageId, emoji }) => {
      const previousMessages = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData || !currentUser) return oldData

        const newPages = oldData.pages.map((page) =>
          page.map((msg) => {
            if (msg._id === messageId) {
              const newReactions = [...(msg.reactions || [])]
              const existingIndex = newReactions.findIndex(
                (r) =>
                  (r.userId?._id || r.userId)?.toString() === currentUser._id.toString() &&
                  r.emoji === emoji,
              )

              const optimisticReaction = {
                emoji,
                userId: {
                  _id: currentUser._id,
                  username: currentUser.username,
                  fullName: currentUser.fullName,
                  profileImg: currentUser.profileImg,
                },
              }

              if (existingIndex !== -1) {
                newReactions.splice(existingIndex, 1)
              } else {
                newReactions.push(optimisticReaction)
              }
              return { ...msg, reactions: newReactions }
            }
            return msg
          }),
        )
        return { ...oldData, pages: newPages }
      })

      if (onReactionAdded) {
        onReactionAdded(messageId)
      }

      return { previousMessages }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(queryKey, context.previousMessages)
    },
  })

  return { addReaction, isReacting }
}
