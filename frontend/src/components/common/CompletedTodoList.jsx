import { formatTime } from "../../utils/date"
import { FaCheck } from "react-icons/fa6"

const CompletedTodoList = ({ todos, isLoading, isError }) => {
  if (isLoading) return <div className="p-4">Loading completed tasks...</div>
  if (isError) return <div className="p-4 text-error">Error fetching completed tasks.</div>
  if (!todos || todos.length === 0) {
    return <div className="p-4 text-center text-gray-500">No completed tasks yet.</div>
  }

  return (
    <ul className="space-y-2">
      {todos.map((todo) => (
        <li key={todo._id} className="border-b border-slate-600 pb-2 text-sm last:border-b-0">
          <div className="flex items-center gap-3 px-3 py-1">
            <div className="relative flex-shrink-0">
              <img
                src={todo.user.profileImg?.imageUrl || "/avatar-placeholder.png"}
                className="size-9 rounded-full"
              />

              <div
                className={`absolute bottom-2 right-2 z-10 flex size-4 translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full bg-green-500 text-center text-white`}
              >
                <FaCheck className="size-2" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate">
                You completed a task: <strong>{todo.title}</strong>
              </p>
              <p className="text-slate-400">{formatTime(todo.createdAt)}</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default CompletedTodoList
