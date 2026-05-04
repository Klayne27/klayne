import { useQuery } from "@tanstack/react-query"
import { getAllSuggestionsApi } from "../../../api/suggestionApi"
import { SUGGESTIONS_KEY } from "./suggestionKeys"

export const useGetAllSuggestions = ({ status, type, page } = {}) => {
  const { data, isLoading } = useQuery({
    queryKey: [SUGGESTIONS_KEY, { status, type, page }],
    queryFn: () => getAllSuggestionsApi({ status, type, page }),
  })
  return {
    suggestions: data?.suggestions ?? [],
    totalPages: data?.totalPages ?? 1,
    total: data?.total ?? 0,
    isLoading,
  }
}
