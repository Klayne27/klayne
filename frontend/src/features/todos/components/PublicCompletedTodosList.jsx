import { forwardRef } from "react"
import { colorMap, getTextColor, groupTodosByDate, iconMap } from "../../../utils/todoUtils.jsx"
import { formatTime } from "../../../utils/date/index.js"
import { FaCheck } from "react-icons/fa6"
import LoadingSpinner from "../../../components/common/LoadingSpinner.jsx"
import { getOptimizedImageUrl } from "../../../utils/cloudinaryUtils.js"

const PublicCompletedTodosList = forwardRef(
  ({ todos, isLoading, isError, isFetchingNextPage, hasNextPage }, ref) => {
    const allPublicTodos = todos?.pages?.flatMap((page) => page.publicCompletedTodos) || []
    const groupedTodos = groupTodosByDate(allPublicTodos)

    if (isLoading)
      return (
        <div className="flex h-screen items-center justify-center text-primary">
          <LoadingSpinner />
        </div>
      )
    if (isError) return <div className="p-4 text-error">Error fetching public completed tasks.</div>
    if (!allPublicTodos || allPublicTodos.length === 0) {
      return <div className="p-4 text-center text-gray-500">No public completed tasks yet.</div>
    }

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
              {group.todos.map((todo, todoIndex) => {
                const isLastGroup = groupIndex === groupedTodos.length - 1
                const isLastItemInGroup = todoIndex === group.todos.length - 1
                const isLastElement = isLastGroup && isLastItemInGroup
                const IconComponent = iconMap[todo?.listMeta?.icon]

                return (
                  <li
                    key={todo?._id}
                    className="border-b border-slate-600 pb-2 text-sm last:border-b-0"
                  >
                    <div className="relative flex items-center gap-3 px-3 py-1">
                      <div className="relative flex-shrink-0">
                        <img
                          src={getOptimizedImageUrl(
                            todo?.user?.profileImg?.imageUrl || "/avatar-placeholder.png",
                            "avatar",
                          )}
                          className="size-9 rounded-full"
                          alt="User profile"
                        />
                        <div className="absolute bottom-2 right-2 z-10 flex size-4 translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full bg-green-500 text-center text-white">
                          <FaCheck className="size-2" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate">
                          <strong
                            style={todo?.user.nameColor ? { color: todo?.user.nameColor } : undefined}
                          >
                            {todo?.user?.fullName}
                          </strong>{" "}
                          completed a task:{" "}
                          <strong className={getTextColor(todo?.priority)}>{todo?.title}</strong>
                        </p>
                        <p className="text-slate-400">{formatTime(todo?.completedAt)}</p>
                      </div>
                      <div className="absolute right-3 mt-5 flex items-center gap-1 text-xs text-slate-400">
                        <span>
                          {IconComponent ? (
                            <IconComponent className={`${colorMap[todo?.listMeta?.color]}`} />
                          ) : (
                            ""
                          )}
                        </span>
                        {todo?.listMeta?.name}
                      </div>
                    </div>
                  </li>
                )
              })}
              {hasNextPage && isFetchingNextPage && (
                <div className="flex justify-center p-4" ref={ref}>
                  <LoadingSpinner />
                </div>
              )}
            </ul>
          </div>
        ))}
      </>
    )
  },
)

export default PublicCompletedTodosList
