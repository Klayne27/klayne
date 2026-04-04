import { CiTrophy } from "react-icons/ci"
import { FaEllipsis, FaEllipsisVertical } from "react-icons/fa6"
import { LuListTodo } from "react-icons/lu"
import { MdLibraryBooks } from "react-icons/md"
import { useNavigate } from "react-router-dom"

function RightDropdown({ onToggleRightDropdown, isRightDropdownOpen }) {
  const navigate = useNavigate()

  return (
    <div className="absolute right-0 top-24 flex flex-col items-center justify-center gap-1 md:right-1 md:top-28">
      <button
        onClick={onToggleRightDropdown}
        className="flex h-12 w-12 items-center justify-center rounded-full text-slate-500 transition-all md:hover:bg-slate-700/50 md:hover:text-white"
        aria-label="Toggle navigation"
      >
        <FaEllipsisVertical
          size={25}
          className={`absolute transition-all duration-300 ease-in-out ${isRightDropdownOpen ? "rotate-0 opacity-100" : "rotate-90 opacity-0"} `}
        />
        <FaEllipsis
          size={25}
          className={`absolute transition-all duration-300 ease-in-out ${isRightDropdownOpen ? "-rotate-90 opacity-0" : "rotate-0 opacity-100"} `}
        />
      </button>
      <div
        className={`flex origin-top transform flex-col items-center justify-center gap-1 transition-all duration-300 ease-in-out ${isRightDropdownOpen ? "visible scale-y-100 opacity-100" : "invisible scale-y-0 opacity-0"} `}
      >
        <button
          onClick={() => navigate("/study-leaderboard")}
          className="flex h-12 w-12 items-center justify-center rounded-full text-slate-500 transition-all md:hover:bg-slate-700/50 md:hover:text-white"
        >
          <CiTrophy size={25} strokeWidth={1} />
        </button>
        <button
          onClick={() => navigate("/study-activity")}
          className="flex h-12 w-12 items-center justify-center rounded-full text-slate-500 transition-all md:hover:bg-slate-700/50 md:hover:text-white"
        >
          <MdLibraryBooks size={25} />
        </button>
        <button
          onClick={() => navigate("/todos")}
          className="flex h-12 w-12 items-center justify-center rounded-full text-slate-500 transition-all md:hover:bg-slate-700/50 md:hover:text-white"
        >
          <LuListTodo size={25} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}

export default RightDropdown
