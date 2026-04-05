const BASE_URL = "/api/board"

export const getBoardPostsApi = async ({ pageParam = 1 }) => {
  const res = await fetch(`${BASE_URL}?page=${pageParam}&limit=12`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch board posts")
  return data
}

export const getBoardPostApi = async (id) => {
  const res = await fetch(`${BASE_URL}/${id}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch board post")
  return data
}

export const createBoardPostApi = async ({ title, content, img, tags }) => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content, img, tags }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to create board post")
  return data
}

export const deleteBoardPostApi = async (id) => {
  const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to delete board post")
  return data
}

export const reactToBoardPostApi = async ({ id, emoji }) => {
  const res = await fetch(`${BASE_URL}/${id}/react`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emoji }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to react")
  return data
}

export const getBoardCommentsApi = async ({ queryKey, pageParam = 1 }) => {
  const [, , id] = queryKey
  const res = await fetch(`${BASE_URL}/${id}/comments?page=${pageParam}&limit=20`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch comments")
  return data
}

export const createBoardCommentApi = async ({ id, content, img }) => {
  const res = await fetch(`${BASE_URL}/${id}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, img }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to create comment")
  return data
}

export const deleteBoardCommentApi = async (commentId) => {
  const res = await fetch(`${BASE_URL}/comments/${commentId}`, { method: "DELETE" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to delete comment")
  return data
}

export const reactToBoardCommentApi = async ({ commentId, emoji }) => {
  const res = await fetch(`${BASE_URL}/comments/${commentId}/react`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emoji }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to react to comment")
  return data
}
