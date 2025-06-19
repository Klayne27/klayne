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

export const fetchMessagesApi = async (conversationId) => {
  if (!conversationId || conversationId.startsWith("new-")) return [];

  const res = await fetch(`/api/messages/conversations/${conversationId}`);
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
}) => {
  const res = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipientId, message, img, conversationId, repliedTo }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to send message");
  }
  return res.json();
};
