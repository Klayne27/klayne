import { useGetTodoActivities } from "../hooks/todoActivitiesHooks/useGetTodoActivities"
import TodoPagesHeader from "../components/common/TodoPagesHeader"
import { useInView } from "react-intersection-observer" // Import the hook
import LoadingSpinner from "../components/ui/LoadingSpinner"
import { useEffect } from "react"
import ActivityLogList from "../components/common/ActivityLogList"



const TodoActivityLogPage = () => {
  const { todoActivities, todoActivitiesLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGetTodoActivities()

  const { ref, inView } = useInView() // Initialize the observer hook

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
