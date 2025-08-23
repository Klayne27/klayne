// src/components/todos/TodoList.jsx
import { useUpdateTodo } from "../../hooks/todoHooks/useUpdateTodo"
import { useTodoStore } from "../../store/useTodoStore"
import TodoEditModal from "./TodoEditModal"
import TodoItem from "./TodoItem"

const TodoList = ({ todos, isLoading, isError, openTodoDropdownId, setOpenTodoDropdownId }) => {
  const { selectedTodo, showEditTodoModal, setShowEditTodoModal } = useTodoStore()
  const { updateTodo, isUpdatingTodo } = useUpdateTodo()

  const handleSaveUpdate = (updateData) => {
    // This logic is now in the parent component
    updateTodo(updateData)
  }

  if (isLoading) return <div className="p-4">Loading your todos...</div>
  if (isError) return <div className="p-4 text-error">Error fetching todos.</div>

  const activeTodos = todos.filter((todo) => !todo.completed)

  return (
    <ul>
      {activeTodos.map((todo) => (
        <TodoItem
          todo={todo}
          key={todo._id}
          openTodoDropdownId={openTodoDropdownId}
          setOpenTodoDropdownId={setOpenTodoDropdownId}
        />
      ))}
      {showEditTodoModal && selectedTodo && (
        <TodoEditModal
          isOpen={showEditTodoModal}
          onClose={() => setShowEditTodoModal(false)}
          todo={selectedTodo} // Pass the selectedTodo from the store
          onSave={handleSaveUpdate}
          isLoading={isUpdatingTodo}
        />
      )}
    </ul>
  )
}

export default TodoList
