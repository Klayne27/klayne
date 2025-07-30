const BASE_URL = "/api/notifications";

export const fetchNotificationsApi = async () => {
  const res = await fetch(`${BASE_URL}`, { credentials: "include" });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");

  return data;
};

export const deleteNotificationApi = async (notificationId) => {
  const res = await fetch(`${BASE_URL}/${notificationId}`, {
    method: "DELETE",
  });

  const data = res.json();

  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
};

export const deleteNotificationsApi = async () => {
  const res = await fetch(`${BASE_URL}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");

  return data;
};
