export const fetchConversationsApi = async () => {
  const res = await fetch("/api/messages/conversations");
  if (!res.ok) {
    throw new Error("Failed to fetch conversations");
  }
  return res.json();
};

export const fetchFollowedUsersForMessagingApi = async () => {
  const res = await fetch("/api/messages/followed-users-for-messaging");
  if (!res.ok) {
    throw new Error("Failed to fetch followed users for messaging");
  }
  return res.json();
};

export const deleteMessageApi = async (messageId) => {
  const res = await fetch(`/api/messages/${messageId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to delete message.");
  }
  return data;
};

export const fetchMessagesApi = async (conversationId, page = 1, limit = 20) => {
  if (!conversationId || conversationId.startsWith("new-")) return [];

  const res = await fetch(
    `/api/messages/conversations/${conversationId}?page=${page}&limit=${limit}`
  );

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to fetch messages");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export const sendMessageApi = async ({
  recipientId,
  message,
  img,
  conversationId,
  repliedTo,
  tempId,
}) => {
  const res = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipientId,
      message,
      img,
      conversationId,
      repliedTo,
      tempId,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to send message");
  }
  return res.json();
};

export const deleteConversationApi = async (conversationId) => {
  try {
    const res = await fetch(`/api/messages/conversations/${conversationId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Something went wrong during deletion");
    }

    return data;
  } catch (error) {
    console.error("Error in deleteConversation mutation:", error);
    throw error;
  }
};

export const reactToMessageApi = async (messageId, emoji) => {
  const res = await fetch(`/api/messages/react/${messageId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emoji }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to react to message");

  return data;
};
