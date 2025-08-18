import { useQuery } from "@tanstack/react-query"
import { getTodoActivityApi } from "../../api/todoActivityApi"

export const useGetTodoActivities = () => {
  const { data: todoActivities, isLoading: todoActivitiesLoading } = useQuery({
    queryKey: ["todoActivityLog"],
    queryFn: getTodoActivityApi,
  })
  return { todoActivities, todoActivitiesLoading }
}
