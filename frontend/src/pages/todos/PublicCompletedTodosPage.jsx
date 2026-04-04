import { useInView } from "react-intersection-observer"
import { useEffect } from "react"
import PublicCompletedTodosList from "../../features/todos/components/PublicCompletedTodosList"
import TodoPagesHeader from "../../features/todos/components/TodoPagesHeader"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import { useGetPublicCompletedTodos } from "../../features/todos/todoHooks/useTodoQueries"

const PublicCompletedTodosPage = () => {
  const {
    publicCompletedTodos,
    isLoadingPublicCompletedTodos,
    publicCompletedTodosError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useGetPublicCompletedTodos()

  const { ref, inView } = useInView()

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, fetchNextPage])

  if (isLoadingPublicCompletedTodos)
    return (
      <div className="flex h-screen items-center justify-center text-primary">
        <LoadingSpinner />
      </div>
    )
  if (publicCompletedTodosError) return <div>Error fetching public completed todos.</div>

  return (
    <>
      <TodoPagesHeader pageTitle={"Public Completed Tasks"} />
      <PublicCompletedTodosList
        todos={publicCompletedTodos}
        ref={ref}
        isLoading={isLoadingPublicCompletedTodos}
        isError={publicCompletedTodosError}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
      />
    </>
  )
}

export default PublicCompletedTodosPage
