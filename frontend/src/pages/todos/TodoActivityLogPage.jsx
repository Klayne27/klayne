import TodoPagesHeader from "../../features/todos/TodoPagesHeader"
import { useInView } from "react-intersection-observer"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import { useEffect } from "react"
import ActivityLogList from "../../features/todos/ActivityLogList"
import { useGetTodoActivities } from "../../features/todos/todoHooks/useTodoQueries"

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
