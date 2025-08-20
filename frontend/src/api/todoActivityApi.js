export const getTodoActivityApi = async ({ pageParam = 0 }) => {
  const res = await fetch(`/api/activities?page=${pageParam}`)

  const data = await res.json()

  if (!res.ok) throw new Error(data.error || "Failed to fetch todo activities")

  return data
}
