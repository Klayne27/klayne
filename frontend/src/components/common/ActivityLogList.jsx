import { forwardRef } from "react"
import { formatTime } from "../../utils/date"
import { getBadgeColor, getTextColor, groupTodosByDate } from "../../utils/todoUtils"
import LoadingSpinner from "../ui/LoadingSpinner"
import { FaCheck, FaMinus, FaPen, FaPlus } from "react-icons/fa"

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

export const ActivityLogList = forwardRef(
  ({ todoActivities, hasNextPage, isFetchingNextPage }, ref) => {
    const allTodoActivities = todoActivities?.pages?.flatMap((page) => page.activities) || []

    const groupedTodos = groupTodosByDate(allTodoActivities)

    return (
      <>
        {groupedTodos.map((group, groupIndex) => (
          <div key={group.label} className="mb-4">
            <h3
              className={`mb-2 ${groupIndex === 0 ? "border-b" : "border-y"} border-gray-600 px-4 py-2 text-lg font-bold`}
            >
              {group.label}
            </h3>

            <ul className="space-y-2">
              {group?.todos.map((activity, todoIndex) => {
                const isLastGroup = groupIndex === groupedTodos.length - 1
                const isLastItemInGroup = todoIndex === group.todos.length - 1
                const isLastElement = isLastGroup && isLastItemInGroup

                return (
                  <li
                    key={activity._id}
                    ref={isLastElement ? ref : null} // Apply ref only to the very last todo
                    className="border-b border-slate-600 pb-2 text-sm last:border-b-0"
                  >
                    <div className="flex items-center gap-3 px-3 py-1">
                      <div className="relative">
                        <img
                          src={activity.user.profileImg?.imageUrl || "/avatar-placeholder.png"}
                          className="size-9 rounded-full"
                        />
                        <div
                          className={`absolute bottom-2 ${getBadgeColor(
                            activity.action,
                          )} right-2 z-10 flex size-4 translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full bg-green-500 text-center text-white`}
                        >
                          {getActionIcon(activity.action)}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate">
                          You {activity.action.split("_")[0]} a task:{" "}
                          <strong className={getTextColor(activity.todoPriority)}>
                            {activity.todoTitle}
                          </strong>
                        </p>
                        <p className="text-slate-400">{formatTime(activity.createdAt)}</p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        {/* A loading indicator at the bottom of the list */}
        <div ref={ref} className="py-4">
          {isFetchingNextPage && hasNextPage && (
            <div className="flex justify-center">
              <LoadingSpinner />
            </div>
          )}
        </div>
      </>
    )
  },
)

export default ActivityLogList
