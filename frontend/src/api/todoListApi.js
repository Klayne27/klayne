const BASE_URL = "/api/todolists"

export const getUserTodoListsApi = async ({ pageParam = 0 }) => {
  const limit = 10
  const res = await fetch(`${BASE_URL}?page=${pageParam}&limit=${limit}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch todo lists")
  return data
}

export const getTodoListByIdApi = async (id) => {
  const res = await fetch(`${BASE_URL}/${id}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch todo list")
  return data
}

export const getFollowingTodoListsApi = async ({ pageParam = 0 }) => {
  const limit = 10
  const res = await fetch(`${BASE_URL}/following?page=${pageParam}&limit=${limit}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch following's lists")
  return data
}

export const getPublicTodoListsApi = async ({ pageParam = 0 }) => {
  const limit = 10
  const res = await fetch(`${BASE_URL}/public?page=${pageParam}&limit=${limit}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch public lists")
  return data
}

export const getTodosInListApi = async (listId) => {
  const res = await fetch(`${BASE_URL}/todos/${listId}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch todos in list")
  return data
}

export const createTodoListApi = async (listData) => {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(listData),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to create todo list")
  return data
}

export const updateTodoListApi = async (listId, listData) => {
  const res = await fetch(`${BASE_URL}/${listId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(listData),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to update todo list")
  return data
}

export const deleteTodoListApi = async (listId) => {
  const res = await fetch(`${BASE_URL}/${listId}`, {
    method: "DELETE",
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to delete todo list")
  return data
}

export const likeUnlikeTodoListApi = async (listId) => {
  const res = await fetch(`${BASE_URL}/like/${listId}`, {
    method: "POST",
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "Failed to like/unlike todo list: Something went wrong")
  }
  return data
}
