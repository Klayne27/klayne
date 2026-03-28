const BASE_URL = "/api/devlogs"

// ── Devlogs ───────────────────────────────────────────────────────────────────

export const getDevlogsApi = async (page = 1, limit = 10) => {
  const res = await fetch(`${BASE_URL}?page=${page}&limit=${limit}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch devlogs")
  return data
}

export const getDevlogApi = async (id) => {
  const res = await fetch(`${BASE_URL}/${id}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch devlog")
  return data
}

export const createDevlogApi = async (payload) => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to create devlog")
  return data
}

export const updateDevlogApi = async ({ id, ...payload }) => {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to update devlog")
  return data
}

export const deleteDevlogApi = async (id) => {
  const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to delete devlog")
  return data
}

// ── Likes ─────────────────────────────────────────────────────────────────────

export const likeDevlogApi = async (id) => {
  const res = await fetch(`${BASE_URL}/${id}/like`, { method: "POST" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to like devlog")
  return data // { likes, isLiked }
}

// ── Comments ──────────────────────────────────────────────────────────────────

export const getDevlogCommentsApi = async (devlogId, page = 1, limit = 20) => {
  const res = await fetch(`${BASE_URL}/${devlogId}/comments?page=${page}&limit=${limit}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch comments")
  return data
}

export const createDevlogCommentApi = async ({ devlogId, text }) => {
  const res = await fetch(`${BASE_URL}/${devlogId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to post comment")
  return data
}

export const deleteDevlogCommentApi = async ({ devlogId, commentId }) => {
  const res = await fetch(`${BASE_URL}/${devlogId}/comments/${commentId}`, {
    method: "DELETE",
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to delete comment")
  return data
}

export const likeDevlogCommentApi = async ({ devlogId, commentId }) => {
  const res = await fetch(`${BASE_URL}/${devlogId}/comments/${commentId}/like`, {
    method: "POST",
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to like comment")
  return data // { likes, dislikes, isLiked }
}

export const dislikeDevlogCommentApi = async ({ devlogId, commentId }) => {
  const res = await fetch(`${BASE_URL}/${devlogId}/comments/${commentId}/dislike`, {
    method: "POST",
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to dislike comment")
  return data // { likes, dislikes, isDisliked }
}
