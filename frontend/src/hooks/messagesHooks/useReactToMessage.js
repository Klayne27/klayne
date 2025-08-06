// In your useReactToMessage hook
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuthUser } from "../../hooks/authHooks/useAuthUser"
import { reactToMessageApi } from "../../api/messagesApi"
import { showAppToast } from "../../utils/showAppToast"

export const useReactToMessage = ({ selectedConversationId, onReactionAdded }) => {
  const queryClient = useQueryClient()
  const { authUser: currentUser } = useAuthUser()

  const { mutate: reactToMessage } = useMutation({
    mutationFn: ({ messageId, emoji }) => reactToMessageApi(messageId, emoji),

    onMutate: async ({ messageId, emoji }) => {
      await queryClient.cancelQueries({ queryKey: ["messages", selectedConversationId] })
      const previousMessages = queryClient.getQueryData(["messages", selectedConversationId])

      queryClient.setQueryData(["messages", selectedConversationId], (oldData) => {
        if (!oldData || !currentUser) return oldData
        const userId = currentUser._id
        const updatedPages = oldData.pages.map((page) =>
          page.map((message) => {
            if (message._id === messageId) {
              const newReactions = [...message.reactions]
              // 👈 Change `r.user` to `r.userId` to match the backend
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
                  // 👈 Change `user` to `userId`
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
    onSuccess: (updatedMessage) => {
      // The onSuccess handler is mostly fine, as it replaces the data with the correct server response
      queryClient.setQueryData(["messages", selectedConversationId], (oldData) => {
        if (!oldData) return oldData
        const updatedPages = oldData.pages.map((page) =>
          page.map((message) => (message._id === updatedMessage._id ? updatedMessage : message)),
        )
        return { ...oldData, pages: updatedPages }
      })
    },
    onError: (err, variables, context) => {
      showAppToast(err.message || "Failed to react.", "error")
      if (context?.previousMessages) {
        queryClient.setQueryData(["messages", selectedConversationId], context.previousMessages)
      }
    },
  })

  return { reactToMessage }
}
