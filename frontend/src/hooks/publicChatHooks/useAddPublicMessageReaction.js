import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthUser } from "../authHooks/useAuthUser";
import { addPublicMessageReactionApi } from "../../api/publicChatApi";

export const useAddPublicMessageReaction = ({ onReactionAdded }) => {
  const queryClient = useQueryClient()
  const { authUser: currentUser } = useAuthUser()

  const { mutate: addReaction, isPending: isReacting } = useMutation({
    mutationFn: ({ messageId, emoji }) => addPublicMessageReactionApi(messageId, emoji),
    onMutate: async ({ messageId, emoji }) => {
      // Optimistic update: Show the reaction immediately
      // No need to cancel queries unless a re-render from fetching would immediately overwrite.
      // queryClient.cancelQueries({ queryKey: ["publicMessages"] }); // Keep commented or remove

      const previousMessages = queryClient.getQueryData(["publicMessages"])

      queryClient.setQueryData(["publicMessages"], (oldData) => {
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

              // Create an optimistic reaction object that mimics the populated structure
              const optimisticReaction = {
                emoji,
                // Ensure the user object matches what your backend populates
                userId: {
                  // Matches PublicChatMessage.reactions.userId
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

      return { previousMessages } // Context for onError
    },
    onSuccess: (updatedMessageFromServer) => {
      // No explicit cache update here, as the Socket.IO event will handle it.
      // We rely on the `publicMessageReactionUpdated` socket event for the ultimate truth.
      // However, it's good practice to invalidate here too, as a fallback in case a socket event is missed.
      // queryClient.invalidateQueries({ queryKey: ["publicMessages"] });
      // If you are relying solely on Socket.IO, this onSuccess can remain empty.
    },
    onError: (err, variables, context) => {
      // showAppToast((err.message || "Failed to add reaction.");
      if (context?.previousMessages) {
        queryClient.setQueryData(["publicMessages"], context.previousMessages)
      }
      queryClient.invalidateQueries({ queryKey: ["publicMessages"] }) // Invalidate on error to refetch correct state
    },
    onSettled: () => {
      // This will refetch in the background, ensuring consistency even if a socket event is missed.
      // It's a safety net.
      //  queryClient.invalidateQueries({ queryKey: ["publicMessages"] });
    },
  })

  return { addReaction, isReacting }
}