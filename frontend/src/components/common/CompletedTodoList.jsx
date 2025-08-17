import React from "react"
import { FaCheckCircle } from "react-icons/fa"

const CompletedTodoList = ({ todos, isLoading, isError }) => {
  if (isLoading) return <div className="p-4">Loading completed tasks...</div>
  if (isError) return <div className="p-4 text-error">Error fetching completed tasks.</div>
  if (!todos || todos.length === 0) {
    return <div className="p-4 text-center text-gray-500">No completed tasks yet.</div>
  }

  return (
    <ul className="space-y-2 p-4">
      {todos.map((todo) => (
        <li key={todo._id} className="flex items-center justify-between rounded-lg bg-base-200 p-3">
          <div className="flex items-center gap-3">
            <FaCheckCircle className="size-5 text-green-500" />
            <span className="text-gray-500 line-through">{todo.title}</span>
          </div>
          <span className="text-xs text-gray-400">
            {new Date(todo.completedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default CompletedTodoList
