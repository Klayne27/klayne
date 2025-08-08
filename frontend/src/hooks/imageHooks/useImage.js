import { useQuery } from "@tanstack/react-query"
import { fetchImageByIdApi } from "../../api/imageApi"

export const useImage = (imageId) => {
  const {
    data: image,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["image", imageId],
    queryFn: () => fetchImageByIdApi(imageId),
    enabled: !!imageId,
  })
  return { image, isLoading, isError, error }
}
