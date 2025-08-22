import CompletedTodoList from "../components/common/CompletedTodoList"
import { useGetCompletedTodos } from "../hooks/todoHooks/useTodoQueries"
import TodoPagesHeader from "../components/common/TodoPagesHeader"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import { useInView } from "react-intersection-observer"
import { useEffect } from "react"

const CompletedTodosPage = () => {
  const {
    completedTodos,
    completedLoading,
    completedError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useGetCompletedTodos()

  const { ref, inView } = useInView()

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, fetchNextPage])

  if (completedLoading)
    return (
      <div className="flex h-screen items-center justify-center text-primary">
        <LoadingSpinner />
      </div>
    )
  if (completedError) return <div>Error fetching completed todos.</div>

  return (
    <>
      <TodoPagesHeader pageTitle={"Completed Tasks"} />

      <CompletedTodoList
        todos={completedTodos}
        ref={ref}
        isLoading={completedLoading}
        isError={completedError}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />
    </>
  )
}

export default CompletedTodosPage
