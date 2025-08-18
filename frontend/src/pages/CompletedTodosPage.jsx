import { useNavigate } from "react-router-dom"
import CompletedTodoList from "../components/common/CompletedTodoList"
import { useGetCompletedTodos } from "../hooks/todoHooks/useTodoQueries"
import TodoPagesHeader from "../components/common/TodoPagesHeader"

const CompletedTodosPage = () => {
  const { completedTodos, completedLoading, completedError } = useGetCompletedTodos()

  if (completedLoading) return <div>Loading completed todos...</div>
  if (completedError) return <div>Error fetching completed todos.</div>

  return (
    <>
      <TodoPagesHeader pageTitle={"Completed Tasks"} />

      <CompletedTodoList
        todos={completedTodos}
        isLoading={completedLoading}
        isError={completedError}
      />
    </>
  )
}

export default CompletedTodosPage
