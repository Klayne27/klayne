import { FaPlus, FaArrowLeft, FaListUl, FaUserGroup, FaGlobe } from "react-icons/fa6"
import { FaCheckSquare } from "react-icons/fa"
import { useNavigate, Outlet, useLocation } from "react-router-dom"
import { useTodoStore } from "../../store/useTodoStore"
import CreateTodoListModal from "./CreateTodoListModal"
import CreateTodoModal from "./CreateTodoModal"
import { RxActivityLog } from "react-icons/rx"
import { IoIosTimer } from "react-icons/io"

const TodoPageLayout = () => {
  const { showCreateTodoListModal, setShowCreateTodoListModal } = useTodoStore()
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { tab: "myLists", label: "My Lists", icon: <FaListUl className="size-5" />, path: "/todos" },
    {
      tab: "followingLists",
      label: "Following",
      icon: <FaUserGroup className="size-5" />,
      path: "/todos/following",
    },
    {
      tab: "publicLists",
      label: "Public",
      icon: <FaGlobe className="size-5" />,
      path: "/todos/public",
    },
    // {
    //   tab: "completedTodos",
    //   label: "Completed",
    //   icon: <FaCheckSquare className="size-5" />,
    //   path: "/todos/completed",
    // },
    // {
    //   tab: "activityLog",
    //   label: "Activity Log",
    //   icon: <RxActivityLog className="size-5" />,
    //   path: "/todos/activity-log",
    // },
    {
      tab: "pomodoro",
      label: "Pomodoro",
      icon: <IoIosTimer className="size-5" />,
      path: "/pomodoro",
    },
  ]

  const activeTab = navItems.find((item) => location.pathname === item.path)?.tab || "myLists"

  return (
    <div className="container relative mx-auto flex h-screen min-h-screen max-w-2xl flex-col border-slate-600 bg-base-100 md:border-x">
      {/* Header */}

      {/* Main Content Area - This is where the specific page component will be rendered */}
      <div className="flex flex-1 flex-col overflow-y-auto pb-36 md:pb-4">
        <Outlet />
      </div>
      {/* Floating "Create List" button */}
      <button
        onClick={() => setShowCreateTodoListModal(true)}
        className="white-shadow absolute bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg transition-transform duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <FaPlus className="h-6 w-6" />
      </button>
      <nav className="absolute inset-x-0 bottom-0 z-40 flex h-16 flex-none items-center justify-around border-t border-slate-600 bg-base-100 p-2 shadow-inner">
        {navItems.map((item) => (
          <button
            key={item.tab}
            onClick={() => navigate(item.path)}
            className={`flex flex-1 flex-col items-center gap-1 rounded-lg p-2 ${
              activeTab === item.tab ? "text-primary" : "text-gray-500"
            }`}
          >
            {item.icon} <span className="text-xs">{item.label}</span>
          </button>
        ))}
      </nav>
      {showCreateTodoListModal && (
        <CreateTodoListModal onClose={() => setShowCreateTodoListModal(false)} />
      )}
      <CreateTodoModal />
    </div>
  )
}

export default TodoPageLayout
