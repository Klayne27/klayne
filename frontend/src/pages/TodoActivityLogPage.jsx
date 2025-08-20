import { useGetTodoActivities } from "../hooks/todoActivitiesHooks/useGetTodoActivities"
import TodoPagesHeader from "../components/common/TodoPagesHeader"
import { formatTime } from "../utils/date"
import { FaCheck, FaMinus, FaPen, FaPlus } from "react-icons/fa6"
import { getBadgeColor, getTextColor } from "../utils/todoUtils"
import { useInView } from "react-intersection-observer" // Import the hook
import LoadingSpinner from "../components/ui/LoadingSpinner"
import { useEffect } from "react"

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
  const { ref, inView } = useInView() // Initialize the observer hook

  const { todoActivities, todoActivitiesLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGetTodoActivities()

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, fetchNextPage])

  if (todoActivitiesLoading)
    return (
      <div className="flex h-screen items-center justify-center text-primary">
        <LoadingSpinner />
      </div>
    )

  return (
    <>
      <TodoPagesHeader pageTitle={"Activiy Log"} />

      <ul className="space-y-2">
        {todoActivities?.pages?.map((page) =>
          page.activities.map((activity) => (
            <li
              key={activity._id}
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
          )),
        )}
      </ul>
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
}

export default TodoActivityLogPage
