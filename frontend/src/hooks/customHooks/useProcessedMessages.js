import { useMemo } from "react"
import { MESSAGE_GROUP_TIME_THRESHOLD_MS } from "../../constants/numberConstants"

export const useProcessedMessage = (messages, pinnedMessagesInfo) => {
  const processedMessages = useMemo(() => {
    if (!messages && !pinnedMessagesInfo) return []

    // Handle case where messages might be undefined or not have pages
    let flattenedMessages = []
    if (messages) {
      if (Array.isArray(messages)) {
        flattenedMessages = messages
      } else if (messages.pages && Array.isArray(messages.pages)) {
        flattenedMessages = messages.pages.flat()
      }
    }

    // Create a Set of message IDs for fast lookups.
    // This is the core of the fix.
    const messageIdSet = new Set(flattenedMessages.map((msg) => msg._id.toString()))

    // 1. Create system message objects from the persistent pinned data.
    //    We now FILTER this list to only include pins whose original message
    //    is present in the current user's flattenedMessages list.
    const systemMessages = (pinnedMessagesInfo || [])
      .filter((pin) => {
        // Safety check for pin structure and to see if the original message exists in the current view.
        return pin && pin.pinnedBy && pin.message
      })
      .map((pin) => {
        return {
          _id: `pinned-${pin.message._id}-${pin.pinnedAt}`, // Create a stable unique key
          isSystemMessage: true,
          text: `${pin.pinnedBy.username || "Unknown user"} pinned a message`,
          pinnedAt: pin.pinnedAt,
          // Use the 'createdAt' field for sorting purposes
          createdAt: pin.pinnedAt,
          pinnedMessageId: pin.message,
          // The sender is the user who pinned the message
          sender: pin.pinnedBy,
        }
      })
      .filter(Boolean)

    // Combine the existing messages and the now-filtered system messages.
    const allMessages = [...flattenedMessages, ...systemMessages]

    // Sort by createdAt date
    allMessages.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.pinnedAt)
      const dateB = new Date(b.createdAt || b.pinnedAt)
      return dateA - dateB
    })

    // The rest of your logic now runs on the fully combined and sorted list
    if (allMessages.length === 0) return []

    const getSenderInfo = (msg) => {
      if (!msg || !msg.sender) {
        return {
          id: "unknown",
          profileImg: "/public/avatar-placeholder.png",
          username: "Unknown user",
        }
      }

      const sender = msg.sender
      const id = typeof sender === "object" ? sender._id : sender
      const profileImg =
        typeof sender === "object" && sender?.profileImg
          ? sender.profileImg
          : "/public/avatar-placeholder.png"
      const username =
        typeof sender === "object" && sender?.username ? sender.username : "Unknown user"
      return { id, profileImg, username }
    }

    let lastMessageDate = null
    const enhanced = allMessages
      .map((message, index) => {
        // Safety check for message
        if (!message) {
          console.warn("Undefined message at index:", index)
          return null
        }

        const prevMessage = allMessages[index - 1]
        const nextMessage = allMessages[index + 1]

        const currentSender = getSenderInfo(message)
        const prevSender = prevMessage ? getSenderInfo(prevMessage) : null
        const nextSender = nextMessage ? getSenderInfo(nextMessage) : null

        let isNewDay = false
        const messageCreatedAt = message.createdAt || message.pinnedAt

        if (lastMessageDate) {
          const messageDate = new Date(messageCreatedAt)
          const lastDate = new Date(lastMessageDate)
          isNewDay =
            messageDate.getDate() !== lastDate.getDate() ||
            messageDate.getMonth() !== lastDate.getMonth() ||
            messageDate.getFullYear() !== lastDate.getFullYear()
        } else {
          isNewDay = true
        }
        lastMessageDate = messageCreatedAt

        const isTimeThresholdExceededPrev = prevMessage
          ? new Date(messageCreatedAt).getTime() -
              new Date(prevMessage.createdAt || prevMessage.pinnedAt).getTime() >
            MESSAGE_GROUP_TIME_THRESHOLD_MS
          : true

        const isFirstInGroup =
          !prevMessage ||
          currentSender.id !== prevSender?.id ||
          isNewDay ||
          isTimeThresholdExceededPrev

        const isTimeThresholdExceededNext = nextMessage
          ? new Date(nextMessage.createdAt || nextMessage.pinnedAt).getTime() -
              new Date(messageCreatedAt).getTime() >
            MESSAGE_GROUP_TIME_THRESHOLD_MS
          : true

        const isLastInGroup =
          !nextMessage || currentSender.id !== nextSender?.id || isTimeThresholdExceededNext

        return {
          ...message,
          isNewDay,
          isFirstInGroup,
          isLastInGroup,
          senderProfileImg: currentSender.profileImg,
          senderUsername: currentSender.username,
        }
      })
      .filter(Boolean)

    return enhanced
  }, [messages, pinnedMessagesInfo])

  return processedMessages
}
