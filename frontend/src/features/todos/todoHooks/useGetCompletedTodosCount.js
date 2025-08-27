import { useQuery } from "@tanstack/react-query"
import { todoKeys } from "./todoKeys"
import { getCompletedTodosCountApi } from "../../../api/todoApi"

export const useGetCompletedTodosCount = () => {
  const { data: completedTodosCount, isLoading: loadingCompletedTodosCount } = useQuery({
    queryKey: todoKeys.completedCount(),
    queryFn: getCompletedTodosCountApi,
  })
  return { completedTodosCount, loadingCompletedTodosCount }
}
