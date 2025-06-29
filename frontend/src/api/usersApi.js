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

    // If the response is not OK, we'll check the status
    if (!res.ok) {
      // Parse the error response to get the message and any blocking flags
      const errorData = await res.json();

      if (res.status === 403 && errorData.hasBlockedYou) {
        // This is the specific "You are blocked" scenario.
        // We return this special object instead of throwing,
        // so React Query doesn't retry, and the frontend can read these flags.
        return {
          user: null, // No actual user data available for a blocked user
          isBlockedByYou: errorData.isBlockedByYou, // false in this case
          hasBlockedYou: errorData.hasBlockedYou, // true
          message: errorData.error, // "You are blocked by this user."
          status: 403, // Indicate the HTTP status for the frontend
        };
      } else if (res.status === 404) {
        // Handle "User not found" explicitly
        return {
          user: null,
          message: errorData.error, // "User not found"
          status: 404,
        };
      } else {
        // For any other non-OK status (e.g., 500, other errors), throw an error
        throw new Error(errorData.error || "Something went wrong fetching profile.");
      }
    }

    // If response is OK, parse and return the actual user profile data
    const data = await res.json();
    return {
      user: data,
      isBlockedByYou: data.isBlockedByYou, // These flags are now part of the successful user data
      hasBlockedYou: data.hasBlockedYou, // for non-blocking scenarios, or when you blocked them.
      status: 200,
    };
  } catch (error) {
    console.error("Error in fetchUserPofileApi:", error.message);
    throw error; // Re-throw general network errors or unexpected issues
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

export const deleteUserAccountApi = async (userId) => {
  const res = await fetch(`/api/users/delete/${userId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to delete account");
  }
  return data;
};

export const searchUsersApi = async (query) => {
  const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to search users");
  }
  return data;
};

// --- START: NEW API FUNCTION FOR BLOCKING ---
export const blockUnblockUserApi = async (userId) => {
  const res = await fetch(`/api/users/block/${userId}`, {
    method: "POST",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to block/unblock user");
  }
  return data;
};
// --- END: NEW API FUNCTION FOR BLOCKING ---
