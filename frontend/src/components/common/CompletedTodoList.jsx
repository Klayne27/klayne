import { formatTime } from "../../utils/date"
import { FaCheck } from "react-icons/fa6"

// const getTextColor = (priority) => {
//   switch (priority) {
//     case "urgent":
//       return "text-red-400"
//     case "high":
//       return "text-orange-400"
//     case "medium":
//       return "text-yellow-400"
//     case "low":
//     default:
//       return ""
//   }
// }

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
            <div className="grid grid-cols-[1fr_6fr] items-center px-3 py-1">
              <div className="relative">
                <img
                  src={todo.user.profileImg?.imageUrl || "/avatar-placeholder.png"}
                  className="col-span-1 size-9 rounded-full"
                />
                <div
                  className={`absolute bottom-0 right-[10px] z-10 flex size-4 items-center justify-center rounded-full bg-green-500 text-center text-white`}
                >
                  <FaCheck className="size-2" />
                </div>
              </div>
              <div className="">
                <p>
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
