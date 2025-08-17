import React from "react"
import { Link } from "react-router-dom"
import { formatDistanceToNow } from "date-fns"

const TodoFeed = ({ todos, isLoading, isError }) => {
  if (isLoading) return <div>Loading todos...</div>
  if (isError) return <div>Error fetching todos.</div>
  if (!todos || todos.length === 0)
    return <div className="text-center text-gray-500">No public todos to show.</div>

  return (
    <ul className="space-y-4">
      {todos.map((todo) => (
        <li key={todo._id} className="card bg-base-200 p-4">
          <div className="mb-2 flex items-center gap-4">
            <Link to={`/profile/${todo.user.username}`} className="avatar">
              <div className="w-10 rounded-full">
                <img
                  src={todo.user.profileImg?.url || "/path/to/default-avatar.png"}
                  alt="Profile"
                />
              </div>
            </Link>
            <div>
              <Link to={`/profile/${todo.user.username}`} className="font-bold hover:underline">
                {todo.user.fullName}
              </Link>
              <span className="text-sm text-gray-500"> @{todo.user.username}</span>
              <p className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(todo.createdAt))} ago
              </p>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-bold">{todo.title}</h4>
            <p className="text-sm text-gray-500">{todo.description}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default TodoFeed
