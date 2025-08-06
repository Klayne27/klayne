import { useMemo } from "react"

export const useMessagingMetaData = (message, currentUser) => {
  const isSentByCurrentUser = message.sender?._id === currentUser?._id
  const isEditable = isSentByCurrentUser && !message.isDeletedByAdmin && !message.isDeletedByUser
  const isAuthUserAdmin = currentUser.isAdmin
  const isSenderBanned = message.sender.isBannedInPublicChat
  const isMessageDeleted = message.isDeletedByAdmin || message.isDeletedByUser
  const isReplyToMessageDeleted =
    message.repliedTo?.isDeletedByAdmin || message.repliedTo?.isDeletedByUser
  const isMessageEdited = message.isEdited

  const groupedReactions = useMemo(() => {
    return message.reactions?.reduce((acc, reaction) => {
      const reactorId = reaction.userId?._id?.toString() || reaction.user?._id?.toString()
      const reactorUsername = reaction?.userId?.username || "Unknown"
      const reactorProfileImg = reaction.userId?.profileImg || "/avatar-placeholder.png"

      if (!reactorId) return acc

      acc[reaction.emoji] = acc[reaction.emoji] || {
        count: 0,
        users: [],
        userIds: [],
      }

      acc[reaction.emoji].count++

      if (!acc[reaction.emoji].userIds.includes(reactorId)) {
        acc[reaction.emoji].users.push({
          _id: reactorId,
          username: reactorUsername,
          profileImg: reactorProfileImg,
          fullName: reaction?.userId?.fullName,
        })
        acc[reaction.emoji].userIds.push(reactorId)
      }
      return acc
    }, {})
  }, [message.reactions])

  // acc[reaction.emoji] = acc[reaction.emoji] || {
  //     count: 0,
  //     users: [],
  //     userIds: [],
  //   }
  //   acc[reaction.emoji].count++

  //   const reactorId = reaction.user?._id?.toString() || reaction.user?.toString()
  //   if (reactorId) {
  //     acc[reaction.emoji].userIds.push(reactorId)
  //   }
  //   return acc
  // }, {})

  const hasAnyReactions = Object.keys(groupedReactions || {}).length > 0

  return {
    isSentByCurrentUser,
    isEditable,
    isAuthUserAdmin,
    isSenderBanned,
    isMessageDeleted,
    isReplyToMessageDeleted,
    isMessageEdited,
    groupedReactions,
    hasAnyReactions,
  }
}
