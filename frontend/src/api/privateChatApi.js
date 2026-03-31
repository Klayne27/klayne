const BASE_URL = "/api/messages"

export const getConversationsApi = async () => {
  const res = await fetch(`${BASE_URL}/conversations`)
  if (!res.ok) {
    throw new Error("Failed to fetch conversations")
  }
  return res.json()
}

export const getConversationBetweenUsersApi = async (otherUserId) => {
  const res = await fetch(`${BASE_URL}/conversations/between/${otherUserId}`)

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch conversation between users")
  }

  return data
}

export const getMessagesApi = async (conversationId, page = 1, limit = 40) => {
  if (!conversationId) return []

  const res = await fetch(`${BASE_URL}/conversations/${conversationId}?page=${page}&limit=${limit}`)

  const data = await res.json()

  if (!res.ok) throw new Error(data.error || "Failed to fetch messages")

  return data
}

export const getFollowedUsersForMessagingApi = async (searchQuery = "") => {
  const url = searchQuery
    ? `${BASE_URL}/followed-for-messaging?q=${encodeURIComponent(searchQuery)}`
    : `${BASE_URL}/followed-for-messaging`

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch followed users.")
  }
  return data
}

export const searchConversationsAndUsersApi = async (searchQuery = "") => {
  const url = searchQuery
    ? `${BASE_URL}/search?q=${encodeURIComponent(searchQuery)}`
    : `${BASE_URL}/search`

  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to search.")
  return data // { users: [], groupChats: [] }
}

export const getOrCreateConversationApi = async ({ targetUserId, participantIds, name }) => {
  const res = await fetch(`${BASE_URL}/conversations/get-or-create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetUserId, participantIds, name }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to get or create conversation.")
  return data
}

export const deleteConversationApi = async (conversationId) => {
  try {
    const res = await fetch(`${BASE_URL}/conversations/${conversationId}`, {
      method: "DELETE",
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || "Failed to delete conversation")
    }

    return data
  } catch (error) {
    throw new Error(error.message)
  }
}

export const toggleConversationVisibilityApi = async (conversationId) => {
  const res = await fetch(`${BASE_URL}/conversations/visibility/${conversationId}`, {
    method: "PUT",
    headers: { "Content-type": "application/json" },
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || "Failed to toggle conversation hide")
  }

  return data
}

export const sendMessageApi = async ({
  conversationId,
  message,
  img,
  repliedTo,
  voiceMessage,
  voiceMessageDuration,
}) => {
  const res = await fetch(`${BASE_URL}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId,
      message,
      img,
      repliedTo,
      voiceMessage,
      voiceMessageDuration,
    }), 
  })

  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || "Failed to send message")
  }
  return res.json()
}

export const deleteMessageApi = async ({ messageId, conversationId }) => {
  const res = await fetch(`${BASE_URL}/${messageId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "Failed to delete message.")
  }
  return data
}

export const editMessageApi = async (messageId, newText) => {
  const res = await fetch(`${BASE_URL}/edit/${messageId}`, {
    method: "PUT",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify({ newText }),
  })

  const data = await res.json()

  if (!res.ok) throw new Error(data.error || "Failed to edit message")

  return data
}

export const reactToMessageApi = async (messageId, emoji) => {
  const res = await fetch(`${BASE_URL}/react/${messageId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emoji }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to react to message")

  return data
}

export const deleteAllMessagesOnMySide = async (conversationId) => {
  const res = await fetch(`${BASE_URL}/all/${conversationId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || "Failed to delete messages on your side")
  }

  return data
}

export const pinMessageApi = async ({ conversationId, messageId }) => {
  const res = await fetch(`${BASE_URL}/pin-message`, {
    // Change URL to a non-param route
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ conversationId, messageId }), // Send data in the request body
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || "Failed to pin message")
  }
  return data
}

export const getPinnedMessagesApi = async (conversationId) => {
  const res = await fetch(`${BASE_URL}/${conversationId}/pinned`, {
    method: "GET",
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch pinned messages")
  }

  return data
}

export const unpinMessageApi = async ({ conversationId, messageId }) => {
  const res = await fetch(`${BASE_URL}/unpin-message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ conversationId, messageId }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || "Failed to unpin message")
  }
  return data
}
