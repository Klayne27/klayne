const API_URL = "/api/todolists"



export const getUserTodoListsApi = async ({ pageParam = 1 }) => {
  const res = await fetch(`${API_URL}?page=${pageParam}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch todo lists")
  return data // The backend now returns a structured object
}

export const getTodoListByIdApi = async (id) => {
  const res = await fetch(`${API_URL}/${id}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch todo list")
  return data
}

export const getFollowingTodoListsApi = async ({ pageParam = 1 }) => {
  const res = await fetch(`${API_URL}/following?page=${pageParam}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch following's lists")
  return data
}

export const getPublicTodoListsApi = async ({ pageParam = 1 }) => {
  const res = await fetch(`${API_URL}/public?page=${pageParam}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch public lists")
  return data
}

export const getTodosInListApi = async (listId) => {
  const res = await fetch(`${API_URL}/${listId}/todos`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch todos in list")
  return data
}

export const createTodoListApi = async (listData) => {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(listData),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to create todo list")
  return data
}

export const updateTodoListApi = async (listId, listData) => {
  const res = await fetch(`${API_URL}/${listId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(listData),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to update todo list")
  return data
}

export const deleteTodoListApi = async (listId) => {
  const res = await fetch(`${API_URL}/${listId}`, {
    method: "DELETE",
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to delete todo list")
  return data
}

