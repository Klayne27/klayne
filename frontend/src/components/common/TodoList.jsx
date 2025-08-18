// src/components/todos/TodoList.jsx
import TodoItem from "./TodoItem"

const TodoList = ({ todos, isLoading, isError, openTodoDropdownId, setOpenTodoDropdownId }) => {
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
    </ul>
  )
}

export default TodoList
