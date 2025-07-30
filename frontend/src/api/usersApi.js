const BASE_URL = "/api/users";

export const fetchUsersApi = async (endpoint, type) => {
  const res = await fetch(endpoint);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Failed to fetch ${type} list`);
  return data;
};

export const fetchSuggestedUsersApi = async () => {
  const res = await fetch(`${BASE_URL}/suggested`);

  const data = res.json();

  if (!res.ok) throw new Error(data.error || "Failed to fetch suggested users");

  return data;
};

export const fetchUserProfileApi = async (username) => {
  try {
    const res = await fetch(`${BASE_URL}/profile/${username}`);

    if (!res.ok) {
      const errorData = await res.json();

      if (res.status === 403 && errorData.hasBlockedYou) {
        return {
          user: null,
          isBlockedByYou: errorData.isBlockedByYou,
          hasBlockedYou: errorData.hasBlockedYou,
          message: errorData.error,
          status: 403,
        };
      } else if (res.status === 404) {
        return {
          user: null,
          message: errorData.error,
          status: 404,
        };
      } else {
        throw new Error(errorData.error || "Something went wrong fetching profile.");
      }
    }

    const data = await res.json();
    return {
      user: data,
      isBlockedByYou: data.isBlockedByYou,
      hasBlockedYou: data.hasBlockedYou,
      status: 200,
    };
  } catch (error) {
    console.error("Error in fetchUserProfileApi:", error.message);
    throw error;
  }
};

export const updateUserProfileApi = async (formData) => {
  const res = await fetch(`${BASE_URL}/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Failed to update user profile");

  return data;
};

export const followApi = async (userId) => {
  const res = await fetch(`${BASE_URL}/follow/${userId}`, {
    method: "POST",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
};

export const searchUsersApi = async (query) => {
  const res = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to search users");
  }
  return data;
};

export const blockUnblockUserApi = async (userId) => {
  const res = await fetch(`${BASE_URL}/block/${userId}`, {
    method: "POST",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to block/unblock user");
  }
  return data;
};

export const deleteUserAccountApi = async (userId, password) => {
  const res = await fetch(`${BASE_URL}/delete/${userId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to delete account");
  }
  return data;
};

export const deleteUserAccountAdmin = async (userId) => {
  const res = await fetch(`${BASE_URL}/admin/delete/${userId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("jwt")}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to delete user account as admin");
  }

  return data;
};
