import TodoPagesHeader from "../features/todos/TodoPagesHeader"
import { useInView } from "react-intersection-observer"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import { useEffect } from "react"
import { useGetTodoActivities } from "../features/todos/todoHooks/useGetTodoActivities"
import ActivityLogList from "../features/todos/ActivityLogList"

const TodoActivityLogPage = () => {
  const { todoActivities, todoActivitiesLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGetTodoActivities()

  const { ref, inView } = useInView()

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, fetchNextPage])

  if (todoActivitiesLoading)
    return (
      <div className="flex h-screen items-center justify-center text-primary">
        <LoadingSpinner />
      </div>
    )

  return (
    <>
      <TodoPagesHeader pageTitle={"Activity Log"} />

      <ActivityLogList
        todoActivities={todoActivities}
        ref={ref}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />

    </>
  )
}

export default TodoActivityLogPage
