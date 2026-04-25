const BASE_URL = "/api/users"

export const getUsersApi = async (endpoint, type) => {
  const res = await fetch(endpoint)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Failed to fetch ${type} list`)
  return data
}

export const getSuggestedUsersApi = async () => {
  const res = await fetch(`${BASE_URL}/suggested`)

  const data = res.json()

  if (!res.ok) throw new Error(data.error || "Failed to fetch suggested users")

  return data
}

export const getUserProfileApi = async (username) => {
  try {
    const res = await fetch(`${BASE_URL}/profile/${username}`)

    if (!res.ok) {
      const errorData = await res.json()

      if (res.status === 403 && errorData.hasBlockedYou) {
        return {
          user: null,
          isBlockedByYou: errorData.isBlockedByYou,
          hasBlockedYou: errorData.hasBlockedYou,
          message: errorData.error,
          status: 403,
        }
      } else if (res.status === 404) {
        return {
          user: null,
          message: errorData.error,
          status: 404,
        }
      } else {
        throw new Error(errorData.error || "Something went wrong fetching profile.")
      }
    }

    const data = await res.json()
    return {
      user: data,
      isBlockedByYou: data.isBlockedByYou,
      hasBlockedYou: data.hasBlockedYou,
      status: 200,
    }
  } catch (error) {
    console.error("Error in fetchUserProfileApi:", error.message)
    throw error
  }
}

export const updateUserProfileApi = async (formData) => {
  const res = await fetch(`${BASE_URL}/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  })
  const data = await res.json()

  if (!res.ok) throw new Error(data.error || "Failed to update user profile")

  return data
}

export const followApi = async (userId) => {
  const res = await fetch(`${BASE_URL}/follow/${userId}`, {
    method: "POST",
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Something went wrong")
  return data
}

export const searchUsersApi = async (query) => {
  const res = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(query)}`)
  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "Failed to search users")
  }
  return data
}

export const blockUnblockUserApi = async (userId) => {
  const res = await fetch(`${BASE_URL}/block/${userId}`, {
    method: "POST",
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "Failed to block/unblock user")
  }
  return data
}

export const deleteUserAccountApi = async (userId) => {
  const res = await fetch(`${BASE_URL}/delete/${userId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  })
  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "Failed to delete account")
  }
  return data
}

export const deleteUserAccountAdminApi = async (userId) => {
  const res = await fetch(`${BASE_URL}/admin/delete/${userId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("jwt")}`,
    },
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "Failed to delete user account as admin")
  }

  return data
}

export const getVacationModeStatusApi = async () => {
  const res = await fetch(`${BASE_URL}/vacation-mode`)
  const data = await res.json()

  if (!res.ok) {
    throw new Error("Failed to get vacation mode status")
  }

  return data
}

export const toggleVacationModeApi = async (isVacationMode) => {
  const res = await fetch(`${BASE_URL}/vacation-mode`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ isVacationMode }),
  })

  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.message || "Failed to toggle vacation mode")
  }

  const data = await res.json()
  return data
}

export const toggleLikedFeedPrivacyApi = async (isPrivate) => {
  const res = await fetch(`${BASE_URL}/toggle-liked-feed-privacy`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isPrivate }),
  })

  const data = await res.json()

  if (!res.ok) throw new Error("Failed to toggle liked feed privacy")

  return data
}

export const updatePreferredBadgeApi = async (preferredBadge) => {
  const res = await fetch(`${BASE_URL}/update-preferred-badge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ preferredBadge }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || "Failed to update preferred badge")
  }
  return data
}

export const updateStatusPreferenceApi = async (status) => {
  const res = await fetch(`${BASE_URL}/update-status-preference`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  })

  const data = await res.json()

  if (!res.ok) throw new Error(data.error || "Failed to update status preference")

  return data
}

// In your userApi.js or wherever user API calls live
export const updateNameColorApi = async (nameColor) => {
  const res = await fetch("/api/users/name-color", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nameColor }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to update name color")
  return data
}

export const getUserStatsApi = async (username) => {
  const res = await fetch(`/api/users/stats/${username}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch user stats")
  return data
}