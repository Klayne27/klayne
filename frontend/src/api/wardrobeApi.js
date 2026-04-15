const BASE_URL = "/api/wardrobe"

export const getInventoryApi = async () => {
  const res = await fetch(`${BASE_URL}/inventory`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch inventory")
  return data
}

export const equipItemApi = async ({ category, itemKey }) => {
  const res = await fetch(`${BASE_URL}/equip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, itemKey }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to equip item")
  return data
}
