export const getTodoActivityApi = async () => {
  const res = await fetch("/api/activities")

  const data = await res.json()

  if (!res.ok) throw new Error(data.error || "Failed to fetch todo activities")

  return data
}
