// src/hooks/customHooks/useLinkPreview.js
import { useQuery } from "@tanstack/react-query"

const fetchPreview = async (url) => {
  const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
  if (!res.ok) throw new Error("Preview unavailable")
  return res.json()
}

export const useLinkPreview = (url) => {
  const { data: preview, isLoading } = useQuery({
    queryKey: ["linkPreview", url],
    queryFn: () => fetchPreview(url),
    enabled: !!url,
    staleTime: Infinity, // thumbnails/titles don't change
    gcTime: 1000 * 60 * 30,
    retry: false, // don't hammer failed previews
  })
  return { preview, isLoading }
}
