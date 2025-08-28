import { useQuery } from "@tanstack/react-query"
import { getCompletedTodosWithDatesApi } from "../../../api/todoApi"

export const useGetCompletedTodosWithDates = () => {
  const { data: completedTodos, isLoading: completedTodosLoading } = useQuery({
    queryKey: ["completedTodosWithDates"],
    queryFn: getCompletedTodosWithDatesApi,
  })

  return { completedTodos, completedTodosLoading }
}
