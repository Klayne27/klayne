import { CiTrophy } from "react-icons/ci"
import { FaEllipsisVertical } from "react-icons/fa6"
import { LuListTodo } from "react-icons/lu"
import { MdLibraryBooks } from "react-icons/md"
import { useNavigate } from "react-router-dom"

function RightDropdown({ onToggleRightDropdown, isRightDropdownOpen }) {
  const navigate = useNavigate()

  return (
    <div className="fixed right-6 top-32 z-40 flex flex-col items-center gap-3">
      <button
        onClick={onToggleRightDropdown}
        className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg transition-all duration-300 ${isRightDropdownOpen ? "bg-primary text-white" : "bg-base-200 text-slate-400 hover:text-white"}`}
      >
        <FaEllipsisVertical
          size={20}
          className={`transition-transform duration-500 ${isRightDropdownOpen ? "rotate-180" : "rotate-0"}`}
        />
      </button>
      <div
        className={`flex flex-col gap-3 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isRightDropdownOpen ? "translate-x-0 scale-100 opacity-100" : "pointer-events-none translate-x-12 scale-95 opacity-0"}`}
      >
        {[
          { icon: <CiTrophy size={24} />, path: "/study-leaderboard", label: "Leaderboard" },
          { icon: <MdLibraryBooks size={22} />, path: "/study-activity", label: "Activity Feed" },
          { icon: <LuListTodo size={22} />, path: "/todos", label: "Tasks" },
        ].map((item, i) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{ transitionDelay: `${i * 50}ms` }}
            className="group relative flex h-12 w-12 items-center justify-center rounded-2xl bg-base-200/80 text-slate-400 backdrop-blur-md transition-all hover:bg-primary hover:text-white"
          >
            {item.icon}
            {/* Tooltip Right */}
            <span className="absolute right-14 hidden whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs text-white group-hover:block">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default RightDropdown
