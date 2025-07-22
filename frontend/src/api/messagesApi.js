export const fetchConversationsApi = async () => {
  const res = await fetch("/api/messages/conversations");
  if (!res.ok) {
    throw new Error("Failed to fetch conversations");
  }
  return res.json();
};

// export const fetchFollowedUsersForMessagingApi = async () => {
//   const res = await fetch("/api/messages/followed-users-for-messaging");
//   if (!res.ok) {
//     throw new Error("Failed to fetch followed users for messaging");
//   }
//   return res.json();
// };

export const deleteMessageApi = async ({ messageId, conversationId }) => {
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

export const fetchMessagesApi = async (conversationId, page = 1, limit = 40) => {
  if (!conversationId) return [];

  const res = await fetch(
    `/api/messages/conversations/${conversationId}?page=${page}&limit=${limit}`
  );

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to fetch messages");
  }
  // const data = await res.json();
  // return Array.isArray(data) ? data : [];

  return res.json();
};

export const sendMessageApi = async ({ conversationId, message, img, repliedTo }) => {
  const res = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId, message, img, repliedTo }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to send message");
  }
  return res.json();
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

export const editMessageApi = async (messageId, newText) => {
  const res = await fetch(`/api/messages/edit/${messageId}`, {
    method: "PUT",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify({ newText }),
  });

  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Failed to edit message");

  return data;
};

export const toggleConversationVisibilityApi = async (conversationId) => {
  const res = await fetch(`/api/messages/conversations/visibility/${conversationId}`, {
    method: "PUT",
    headers: { "Content-type": "application/json" },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to toggle conversation hide");
  }

  return data;
};

export const getConversationBetweenUsersApi = async (otherUserId) => {
  const res = await fetch(`/api/messages/conversations/between/${otherUserId}`);

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch conversation between users");
  }

  return data;
};
