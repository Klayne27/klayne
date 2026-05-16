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

export const updatePrivacySettingsApi = async (settings) => {
  const res = await fetch(`${BASE_URL}/privacy`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to update privacy settings")
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

export const muteUserApi = async ({ userId, muteType }) => {
  const res = await fetch(`${BASE_URL}/mute/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ muteType }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to mute user")
  return data
}

export const unmuteUserApi = async (userId) => {
  const res = await fetch(`${BASE_URL}/mute/${userId}`, { method: "DELETE" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to unmute user")
  return data
}

export const getMuteStatusApi = async (userId) => {
  const res = await fetch(`${BASE_URL}/mute/${userId}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to get mute status")
  return data
}

export const getSuggestedUsersPageApi = async ({ pageParam = 1 }) => {
  const res = await fetch(`${BASE_URL}/suggested/all?page=${pageParam}&limit=20`)

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch suggested users")
  }

  return data
}
// api/userApi.js — add these three:

export const getFollowRequestsApi = async () => {
  const res = await fetch(`${BASE_URL}/follow-requests`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch follow requests")
  return data
}

export const acceptFollowRequestApi = async (requesterId) => {
  const res = await fetch(`${BASE_URL}/${requesterId}/accept-request`, { method: "POST" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to accept request")
  return data
}

export const declineFollowRequestApi = async (requesterId) => {
  const res = await fetch(`${BASE_URL}/${requesterId}/decline-request`, { method: "POST" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to decline request")
  return data
}

export const updateNoteApi = async ({ text, emoji, expiresInHours }) => {
  const res = await fetch(`${BASE_URL}/note`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, emoji, expiresInHours }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to update note")
  return data
}

export const deleteNoteApi = async () => {
  const res = await fetch(`${BASE_URL}/note`, { method: "DELETE" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to delete note")
  return data
}

export const getFollowingNotesApi = async () => {
  const res  = await fetch(`${BASE_URL}/notes/following`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch following notes");
  return data; 
};

export const removeUserPhotoApi = async (photoType) => {
  const res = await fetch(`${BASE_URL}/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [photoType]: "" }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to remove photo")
  return data
}

export const setPomodoroBackgroundApi = async ({ presetKey, customImage }) => {
  const res = await fetch(`${BASE_URL}/pomodoro-background`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ presetKey, customImage }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to set background")
  return data
}

export const removePomodoroBackgroundApi = async () => {
  const res = await fetch(`${BASE_URL}/pomodoro-background`, { method: "DELETE" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to remove background")
  return data
}