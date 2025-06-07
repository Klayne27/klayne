export const fetchUsersApi = async (endpoint, type) => {
  const res = await fetch(endpoint);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Failed to fetch ${type} list`);
  return data;
};

export const fetchSuggestedUsersApi = async () => {
  const res = await fetch("/api/users/suggested");

  const data = res.json();

  if (!res.ok) throw new Error(data.error || "Something went wrong");

  return data;
};

export const updateUserProfileApi = async (formData) => {
  const res = await fetch(`/api/users/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Something went wrong");

  return data;
};

export const fetchUserPofileApi = async (username) => {
  try {
    const res = await fetch(`/api/users/profile/${username}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Something went wrong");
    }
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const followApi = async (userId) => {
  const res = await fetch(`/api/users/follow/${userId}`, {
    method: "POST",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
};
