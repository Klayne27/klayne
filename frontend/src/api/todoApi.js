const API_URL = "/api/todos"

export const createTodoApi = async ({
  title,
  description,
  todoListId,
  isPublic,
  priority,
  dueDate,
}) => {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description, todoListId, isPublic, priority, dueDate }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to create todo")
  return data
}

export const getUserTodosApi = async () => {
  const res = await fetch(API_URL)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch todos")
  return data
}

export const getFollowingTodosApi = async () => {
  const res = await fetch(`${API_URL}/following`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch following's todos")
  return data
}

export const getPublicTodosApi = async () => {
  const res = await fetch(`${API_URL}/public`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch public todos")
  return data
}

export const updateTodoApi = async (todoId, todoData) => {
  const res = await fetch(`${API_URL}/${todoId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(todoData),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to update todo")
  return data
}

export const completeTodoApi = async (todoId) => {
  const res = await fetch(`${API_URL}/${todoId}/complete`, {
    method: "PUT",
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to complete todo")
  return data
}

export const deleteTodoApi = async (todoId) => {
  const res = await fetch(`${API_URL}/${todoId}`, {
    method: "DELETE",
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to delete todo")
  return data
}

export const getCompletedTodosApi = async ({ pageParam = 0 }) => {
  const res = await fetch(`${API_URL}/completed?page=${pageParam}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch completed todos")
  return data
}

export const getPublicCompletedTodosApi = async ({ pageParam = 0 }) => {
  const res = await fetch(`${API_URL}/public-completed?page=${pageParam}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch public completed todos")

  return data
}

export const getTodoActivityApi = async ({ pageParam = 0 }) => {
  const res = await fetch(`${API_URL}/activities?page=${pageParam}`)

  const data = await res.json()

  if (!res.ok) throw new Error(data.error || "Failed to fetch todo activities")

  return data
}

export const getCompletedTodosCountApi = async () => {
  const res = await fetch(`${API_URL}/completed-count`)
  if (!res.ok) throw new Error("Failed to fetch completed tasks count")
  return res.json()
}

export const getActiveTodosCountApi = async () => {
  const res = await fetch(`${API_URL}/active-count`)
  if (!res.ok) throw new Error("Failed to fetch active todos count")
  return res.json()
}

export const getCompletedTodosHistoryApi = async () => {
  const res = await fetch(`{${API_URL}/history`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch completed todos");
  }
  return res.json();
};