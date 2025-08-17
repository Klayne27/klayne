import { useState } from "react"
import { FaRegCircle, FaTrash, FaEdit } from "react-icons/fa"
import { useTodoStore } from "../../store/useTodoStore"
import { useCompleteTodo, useDeleteTodo } from "../../hooks/todoHooks/useTodoQueries"
import { useAuthUser } from "../../hooks/authHooks/useAuthUser"

const TodoList = ({ todos, isLoading, isError }) => {
  const { authUser: currentUser } = useAuthUser()
  const { setSelectedTodo, setShowEditTodoModal } = useTodoStore()

  const [completingTodoId, setCompletingTodoId] = useState(null)

  const completeTodoMutation = useCompleteTodo()
  const deleteTodoMutation = useDeleteTodo()

  if (isLoading) return <div className="p-4">Loading your todos...</div>
  if (isError) return <div className="p-4 text-error">Error fetching todos.</div>

  const handleComplete = (todoId) => {
    setCompletingTodoId(todoId)
    // Add a small delay for the animation to be visible before optimistic update
    setTimeout(() => {
      completeTodoMutation.mutate(todoId)
    }, 500) // This duration should match your CSS transition
  }

  const handleDelete = (todoId) => deleteTodoMutation.mutate(todoId)
  const handleEdit = (todo) => {
    setSelectedTodo(todo)
    setShowEditTodoModal(true)
  }

  // Filter out any todos that might already be marked as completed
  const activeTodos = todos.filter((todo) => !todo.completed)

//   if (activeTodos.length === 0) {
//     return <div className="p-4 text-center text-gray-500">All done! 🎉</div>
//   }

  return (
    <ul className="space-y-2">
      {activeTodos.map((todo) => (
        <li
          key={todo._id}
          className={`flex items-center justify-between rounded-lg bg-base-100 p-3 shadow-sm transition-all duration-500 ease-in-out ${completingTodoId === todo._id ? "-translate-x-full opacity-0" : "translate-x-0 opacity-100"}`}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleComplete(todo._id)}
              className="text-gray-400 hover:text-green-500"
              disabled={completingTodoId === todo._id}
            >
              <FaRegCircle className="size-5" />
            </button>
            <span className="text-base">{todo.title}</span>
          </div>

          {currentUser && todo.user === currentUser._id && (
            <div className="flex items-center gap-2">
              <button onClick={() => handleEdit(todo)} className="hover:text-blue-500">
                <FaEdit />
              </button>
              <button onClick={() => handleDelete(todo._id)} className="hover:text-red-500">
                <FaTrash />
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

export default TodoList
