export const fetchNotificationsApi = async () => {
  const res = await fetch("/api/notifications", { credentials: "include" });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");

  return data;
};

export const deleteNotificationsApi = async () => {
  const res = await fetch("/api/notifications", {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");

  return data;
};

export const deleteNotificationApi = async (notificationId) => {
  const res = await fetch(`/api/notifications/${notificationId}`, {
    method: "DELETE",
  });

  const data = res.json();

  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
};

export const fetchHasUnreadMessages = async () => {
  const res = await fetch("/api/messages/has-unread-messages"); // Our new endpoint
  if (!res.ok) {
    throw new Error("Failed to fetch unread messages status");
  }
  const data = await res.json();
  return data.hasUnreadMessages;
};
