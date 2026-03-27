const BASE_URL = "/api/devlogs"

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
