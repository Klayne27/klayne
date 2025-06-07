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
