const BASE_URL = "/api/public-chat"

export const getPublicMessagesApi = async ({ pageParam = 1 }) => {
  try {
    const res = await fetch(`${BASE_URL}/messages?page=${pageParam}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || "Failed to fetch public messages")
    }

    return data
  } catch (error) {
    console.error("Error fetching public messages:", error)
    throw error
  }
}

export const sendPublicMessageApi = async ({
  text,
  imgBase64,
  repliedTo,
  voiceMessageBase64,
  voiceMessageDuration,
}) => {
  try {
    const res = await fetch(`${BASE_URL}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        text,
        imgBase64,
        repliedTo,
        voiceMessageBase64,
        voiceMessageDuration,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || "Failed to send public message")
    }

    return data
  } catch (error) {
    console.error("Error sending public message:", error)
    throw error
  }
}

export const adminDeletePublicMessageApi = async (messageId) => {
  try {
    const res = await fetch(`${BASE_URL}/admin/delete/${messageId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || "Failed to delete public message")
    }

    return data
  } catch (error) {
    console.error("Error deleting public message:", error)
    throw error
  }
}

export const deleteOwnPublicMessageApi = async (messageId) => {
  const res = await fetch(`${BASE_URL}/${messageId}`, {
    method: "DELETE",
    headers: { "Content-type": "application/json" },
  })

  const data = await res.json()

  if (!res.ok) throw new Error(data.error || "Failed to delete message")

  return data
}

export const editPublicMessageApi = async (messageId, newText) => {
  const res = await fetch(`${BASE_URL}/edit/${messageId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ newText }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || "Failed to edit message.")
  }
  return data
}

export const banUserFromPublicChatApi = async (userId) => {
  try {
    const res = await fetch(`${BASE_URL}/admin/ban/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || "Failed to ban user from public chat")
    }

    return data
  } catch (error) {
    console.error("Error banning user:", error)
    throw error
  }
}

export const unbanUserFromPublicChatApi = async (userId) => {
  try {
    const res = await fetch(`${BASE_URL}/admin/unban/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || "Failed to unban user from public chat")
    }

    return data
  } catch (error) {
    console.error("Error unbanning user:", error)
    throw error
  }
}

export const addPublicMessageReactionApi = async (messageId, emoji) => {
  const res = await fetch(`${BASE_URL}/${messageId}/react`, {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify({ emoji }),
  })

  const data = await res.json()

  if (!res.ok) throw new Error(data.error || "Failed to react to message")

  return data
}
