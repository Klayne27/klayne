import { useInView } from "react-intersection-observer"
import { useEffect } from "react"
import PublicCompletedTodosList from "../components/common/PublicCompletedTodosList"
import TodoPagesHeader from "../components/common/TodoPagesHeader"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import { useGetPublicCompletedTodos } from "../hooks/todoHooks/useGetPublicCompletedTodos"

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
