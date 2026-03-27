const BASE_URL = "/api/groups"

export const createGroupApi = async ({ name, description, isPrivate, memberIds, avatar }) => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, isPrivate, memberIds, avatar }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to create group")
  return data
}

export const getGroupConversationsApi = async () => {
  const res = await fetch(BASE_URL)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch groups")
  return data
}

export const getGroupApi = async (groupId) => {
  const res = await fetch(`${BASE_URL}/${groupId}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch group")
  return data
}

export const updateGroupApi = async ({ groupId, name, description, isPrivate, avatar }) => {
  const res = await fetch(`${BASE_URL}/${groupId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, isPrivate, avatar }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to update group")
  return data
}

export const deleteGroupApi = async (groupId) => {
  const res = await fetch(`${BASE_URL}/${groupId}`, { method: "DELETE" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to delete group")
  return data
}

export const addMembersApi = async ({ groupId, userIds }) => {
  const res = await fetch(`${BASE_URL}/${groupId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userIds }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to add members")
  return data
}

export const kickMemberApi = async ({ groupId, targetUserId }) => {
  const res = await fetch(`${BASE_URL}/${groupId}/members/${targetUserId}`, {
    method: "DELETE",
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to kick member")
  return data
}

export const leaveGroupApi = async (groupId) => {
  const res = await fetch(`${BASE_URL}/${groupId}/leave`, { method: "DELETE" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to leave group")
  return data
}

export const updateMemberRoleApi = async ({ groupId, targetUserId, role }) => {
  const res = await fetch(`${BASE_URL}/${groupId}/members/${targetUserId}/role`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to update role")
  return data
}

export const transferOwnershipApi = async ({ groupId, targetUserId }) => {
  const res = await fetch(`${BASE_URL}/${groupId}/transfer/${targetUserId}`, {
    method: "PUT",
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to transfer ownership")
  return data
}

export const regenerateInviteCodeApi = async (groupId) => {
  const res = await fetch(`${BASE_URL}/${groupId}/invite`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to regenerate invite link")
  return data
}

export const joinViaInviteCodeApi = async (inviteCode) => {
  const res = await fetch(`${BASE_URL}/join/${inviteCode}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to join group")
  return data
}

export const getJoinRequestsApi = async (groupId) => {
  const res = await fetch(`${BASE_URL}/${groupId}/join-requests`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch join requests")
  return data
}

export const handleJoinRequestApi = async ({ groupId, requestId, action }) => {
  const res = await fetch(`${BASE_URL}/${groupId}/join-requests/${requestId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to handle join request")
  return data
}

export const getMembersApi = async ({ groupId, search = "", page = 1, limit = 20 }) => {
  const params = new URLSearchParams({ search, page, limit })
  const res = await fetch(`${BASE_URL}/${groupId}/members?${params}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch members")
  return data
}

export const adminDeleteMessageApi = async ({ groupId, messageId }) => {
  const res = await fetch(`${BASE_URL}/${groupId}/messages/${messageId}`, {
    method: "DELETE",
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to delete message")
  return data
}
