import { useQuery } from "@tanstack/react-query"
import { fetchImageByIdApi } from "../../api/imageApi"
import { useParams } from "react-router-dom"

export const useImage = () => {
  const {imageId} = useParams()

  const {
    data: image,
    isLoading: isLoadingImage,
    isError,
    error,
  } = useQuery({
    queryKey: ["image", imageId],
    queryFn: () => fetchImageByIdApi(imageId),
    enabled: !!imageId,
  })
  return { image, isLoadingImage, isError, error }
}
