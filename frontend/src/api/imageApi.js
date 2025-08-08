export const fetchImageByIdApi = async (imageId) => {
  try {
    const res = await fetch(`/api/images/${imageId}`)
    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || "Failed to fetch image")
    }

    return data
  } catch (error) {
    console.error(`Error fetching image ${imageId}:`, error)
    throw error
  }
}
