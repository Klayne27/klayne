const BASE = "/api/suggestions"

// img is a base64 data-URL string or null
export const submitSuggestionApi = async ({ type, title, description, img }) => {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, title, description, img: img || null }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to submit suggestion")
  return data
}

export const getAllSuggestionsApi = async ({ status, type, page = 1 } = {}) => {
  const params = new URLSearchParams({ page })
  if (status) params.append("status", status)
  if (type) params.append("type", type)

  const res = await fetch(`${BASE}?${params.toString()}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch suggestions")
  return data
}

export const updateSuggestionStatusApi = async ({ id, status, adminNote }) => {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, adminNote }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to update suggestion")
  return data
}

export const deleteSuggestionApi = async (id) => {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to delete suggestion")
  return data
}
