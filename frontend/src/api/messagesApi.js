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
