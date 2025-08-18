import { useGetTodoActivities } from "../hooks/todoActivitiesHooks/useGetTodoActivities"
import TodoPagesHeader from "../components/common/TodoPagesHeader"
import { formatTime } from "../utils/date"
import { FaCheck, FaMinus, FaPen, FaPlus } from "react-icons/fa6"
import { getBadgeColor, getTextColor } from "../utils/todoUtils"

const getActionIcon = (action) => {
  switch (action) {
    case "created_todo":
      return <FaPlus className="size-[10px]" />
    case "deleted_todo":
      return <FaMinus className="size-[10px]" />
    case "completed_todo":
      return <FaCheck className="size-[10px]" />
    case "updated_todo":
      return <FaPen className="size-2" />
    default:
      return null
  }
}

const TodoActivityLogPage = () => {
  const { todoActivities, todoActivitiesLoading } = useGetTodoActivities()
  if (todoActivitiesLoading) return <div>Loading activity log...</div>

  return (
    <>
      <TodoPagesHeader pageTitle={"Activiy Log"} />

      <ul className="space-y-2">
        {todoActivities.map((activity) => (
          <li key={activity._id} className="border-b border-slate-600 pb-2 text-sm last:border-b-0">
            <div className="grid grid-cols-[1fr_6fr] items-center px-3 py-1">
              <div className="relative">
                <img
                  src={activity.user.profileImg?.imageUrl || "/avatar-placeholder.png"}
                  className="col-span-1 size-9 rounded-full"
                />
                <div
                  className={`absolute bottom-0 right-[10px] z-10 flex size-4 items-center justify-center rounded-full ${getBadgeColor(activity.action)} text-center text-white`}
                >
                  {getActionIcon(activity.action)}
                </div>
              </div>
              <div className="">
                <p>
                  You {activity.action.split("_")[0]} a task:{" "}
                  <strong className={getTextColor(activity.priority)}>{activity.todoTitle}</strong>
                </p>
                <p className="text-slate-400">{formatTime(activity.createdAt)}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

export default TodoActivityLogPage
