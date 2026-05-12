import { FaPlus, FaListUl, FaUserGroup, FaGlobe } from "react-icons/fa6"
import { useNavigate, Outlet, useLocation } from "react-router-dom"
import { IoIosTimer } from "react-icons/io"
import { useTodoStore } from "../../store/useTodoStore"
import { useIsMobile } from "../../hooks/customHooks/useIsMobile"
import TodoAddModal from "../../features/todos/components/TodoAddModal"

const TodoPageLayout = () => {
  const {
    showCreateTodoModal,
    setShowCreateTodoListModal,
  } = useTodoStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isMobile = useIsMobile()

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
    {
      tab: "pomodoro",
      label: "Pomodoro",
      icon: <IoIosTimer className="size-5" />,
      path: "/pomodoro",
    },
  ]

  const activeTab = navItems.find((item) => pathname === item.path)?.tab || ""
  const isCreateSectionPage = pathname.includes("/create-todo-section")
  const isEditSectionPage = pathname.includes("/edit-todo-section")

  const shouldHideNavbar = isCreateSectionPage || isEditSectionPage

  return (
    <div className="container relative mx-auto flex h-screen min-h-screen max-w-2xl flex-col border-accent bg-base-100 md:border-x">
      <div className={`flex flex-1 flex-col overflow-y-auto ${shouldHideNavbar ? "" : "pb-36"}`}>
        <Outlet />
      </div>
      {/* Floating "Create List" button */}
      {!shouldHideNavbar && (
        <>
          {!pathname.startsWith("/todos/") && (
            <button
              onClick={() =>
                isMobile ? navigate("/todos/create-todo-section") : setShowCreateTodoListModal(true)
              }
              className="white-shadow absolute bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary  shadow-lg transition-transform duration-300 hover:scale-110 focus:outline-none"
            >
              <FaPlus className="h-6 w-6" />
            </button>
          )}
          <nav className="absolute inset-x-0 bottom-0 z-40 flex h-16 flex-none items-center justify-around border-t border-accent bg-base-100 p-2 shadow-inner">
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
        </>
      )}

      {showCreateTodoModal && <TodoAddModal />}
    </div>
  )
}

export default TodoPageLayout
