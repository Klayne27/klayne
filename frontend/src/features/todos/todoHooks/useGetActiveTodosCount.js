import { useQuery } from "@tanstack/react-query"
import { todoKeys } from "./todoKeys"
import { getActiveTodosCountApi } from "../../../api/todoApi"

export const useGetActiveTodosCount = () => {
  const { data: activeTodosCount, isLoading: loadingActiveTodosCount } = useQuery({
    queryKey: todoKeys.activeCount(),
    queryFn: getActiveTodosCountApi,
  })

  return { activeTodosCount, loadingActiveTodosCount }
}
