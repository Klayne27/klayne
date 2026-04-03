import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { groupKeys } from "../group/groupChatHooks/groupKeys"
import { conversationKeys } from "./conversationKeys"
import { messageKeys } from "./messageKeys"
import { showAppToast } from "../../../utils/showAppToast"

export const useGroupChatSocketEvents = (socket) => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  useEffect(() => {
    if (!socket) return

    const handleAddedToGroup = (group) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.list() })
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
      showAppToast(`You were added to "${group.name}"`, "success")
    }

    const handleRemovedFromGroup = ({ groupId, groupName }) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.list() })
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
      queryClient.removeQueries({ queryKey: groupKeys.detail(groupId) })
      showAppToast(`You were removed from "${groupName}"`, "error")
      navigate("/messages")
    }

    const handleGroupDeleted = ({ groupId }) => {
      queryClient.removeQueries({ queryKey: groupKeys.detail(groupId) })
      queryClient.invalidateQueries({ queryKey: groupKeys.list() })
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
      showAppToast("This group was deleted.", "error")
      navigate("/messages")
    }

    const handleGroupUpdated = (updatedGroup) => {
      queryClient.setQueryData(groupKeys.detail(updatedGroup._id), updatedGroup)
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
    }

    const handleMessageDeletedByAdmin = ({ messageId, conversationId }) => {
      queryClient.setQueryData(messageKeys.privateMessages(conversationId), (oldData) => {
        if (!oldData) return oldData

        const updatedPages = oldData.pages.map((page) => {
          return page.map((message) => {
            if (message._id === messageId) {
              return {
                ...message,
                isDeletedByAdmin: true,
                img: null,
                image: null,
                text: null,
              }
            }

            if (message.repliedTo && message.repliedTo._id === messageId) {
              return {
                ...message,
                repliedTo: {
                  ...message.repliedTo,
                  isDeletedByAdmin: true,
                  img: null,
                  isOriginalMessageDeleted: true,
                },
              }
            }

            return message
          })
        })

        return { ...oldData, pages: updatedPages }
      })
    }

    const handleJoinRequestRejected = ({ groupName }) => {
      showAppToast(`Your request to join "${groupName}" was rejected.`, "error")
    }

    socket.on("addedToGroup", handleAddedToGroup)
    socket.on("removedFromGroup", handleRemovedFromGroup)
    socket.on("groupDeleted", handleGroupDeleted)
    socket.on("groupUpdated", handleGroupUpdated)
    socket.on("messageDeletedByAdmin", handleMessageDeletedByAdmin)
    socket.on("joinRequestRejected", handleJoinRequestRejected)

    return () => {
      socket.off("addedToGroup", handleAddedToGroup)
      socket.off("removedFromGroup", handleRemovedFromGroup)
      socket.off("groupDeleted", handleGroupDeleted)
      socket.off("groupUpdated", handleGroupUpdated)
      socket.off("messageDeletedByAdmin", handleMessageDeletedByAdmin)
      socket.off("joinRequestRejected", handleJoinRequestRejected)
    }
  }, [socket, queryClient, navigate])
}
