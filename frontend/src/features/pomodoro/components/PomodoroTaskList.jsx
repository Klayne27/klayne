import LoadingSpinner from "../../../components/common/LoadingSpinner"
import { FaCalendar, FaFlag } from "react-icons/fa6"
import { colorMap, getTextColor, iconMap } from "../../../utils/todoUtils"
import { truncateText } from "../../../utils/truncateText"
import useLockBodyScroll from "../../../hooks/customHooks/useLockBodyScroll"

const PomodoroTasksList = ({isOpen, tasks, isLoading, selectedTaskId, setSelectedTaskId }) => {
  useLockBodyScroll(isOpen)
  
    if (isLoading) {
    return (
      <div className="flex w-full justify-center">
        <LoadingSpinner size="sm" />
      </div>
    )
  }

  return (
    <ul className="w-full space-y-2">
      {tasks.length === 0 ? (
        <p className="text-center text-gray-500">No tasks found. Add a task in your Todo list.</p>
      ) : (
        tasks.map((task) => {
          const formattedDueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : null
          const IconComponent = iconMap[task?.icon]

          return (
            <li
              key={task._id}
              onClick={() => setSelectedTaskId(task._id)}
              className={`flex cursor-pointer items-center gap-2 rounded-lg p-3 transition-colors duration-200 ${selectedTaskId === task._id ? "bg-primary/20 text-primary" : "hover:bg-secondary"}`}
            >
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2">
                  <FaFlag className={getTextColor(task.priority)} />{" "}
                  <div className="flex flex-col">
                    {task.listName && (
                      <p className="flex items-center gap-1 text-xs font-bold">
                        {IconComponent && <IconComponent className={`${colorMap[task?.color]}`} />}

                        {truncateText(task.listName, 20)}
                      </p>
                    )}
                    <h3 className="text-sm font-semibold">{truncateText(task.title, 20)}</h3>
                    <p className="text-xs text-slate-500">{truncateText(task.description, 30)}</p>
                    {task.dueDate && (
                      <p className="flex items-center gap-1 text-xs text-slate-500">
                        <FaCalendar /> {formattedDueDate}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          )
        })
      )}
    </ul>
  )
}

export default PomodoroTasksList
