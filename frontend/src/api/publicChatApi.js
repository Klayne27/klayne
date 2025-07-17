export const getPublicMessagesApi = async ({ pageParam = 1 }) => {
  try {
    const res = await fetch(`/api/public-chat/messages?page=${pageParam}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Send cookies with the request
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to fetch public messages");
    }

    return data;
  } catch (error) {
    console.error("Error fetching public messages:", error);
    throw error;
  }
};

export const sendPublicMessageApi = async ({ content, imgBase64 }) => {
  try {
    const res = await fetch(`/api/public-chat/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ content, imgBase64 }), // Send content and imgBase64
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to send public message");
    }

    return data;
  } catch (error) {
    console.error("Error sending public message:", error);
    throw error;
  }
};

export const deletePublicMessageApi = async (messageId) => {
  try {
    const res = await fetch(`/api/public-chat/admin/delete/${messageId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to delete public message");
    }

    return data;
  } catch (error) {
    console.error("Error deleting public message:", error);
    throw error;
  }
};

export const banUserFromPublicChatApi = async (userId) => {
  try {
    const res = await fetch(`/api/public-chat/admin/ban/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to ban user from public chat");
    }

    return data;
  } catch (error) {
    console.error("Error banning user:", error);
    throw error;
  }
};

export const unbanUserFromPublicChatApi = async (userId) => {
  try {
    const res = await fetch(`/api/public-chat/admin/unban/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to unban user from public chat");
    }

    return data;
  } catch (error) {
    console.error("Error unbanning user:", error);
    throw error;
  }
};

export const addPublicMessageReactionApi = async (messageId, emoji) => {
  const res = await fetch(`/api/public-chat/${messageId}/react`, {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify({ emoji }),
  });

  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Failed to react to message");

  return data;
};

export const removePublicMessageReactionApi = async (messageId) => {
  const res = await fetch(`/api/public-chat/${messageId}/react`, {
    method: "DELETE",
    headers: { "Content-type": "application/json" },
  });

  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Failed to remove reaction");

  return data;
};
