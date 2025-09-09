import { CiMail } from "react-icons/ci"
import { FaEllipsis, FaEllipsisVertical } from "react-icons/fa6"
import { useNavigate } from "react-router-dom"
import { formatCount } from "../../utils/textUtils"
import { useSocket } from "../../context/SocketContext"
import { BsChatDots } from "react-icons/bs"
import { GoHome } from "react-icons/go"

function LeftDropdown({onToggleLeftDropdown, isLeftDropdownOpen}) {
  const navigate = useNavigate()
  const { unreadMessageCount, unreadPublicChatCount, newPostCount } = useSocket()

  return (
    <div className="absolute left-0 top-24 flex flex-col items-center justify-center gap-1 md:left-1 md:top-28">
      <button
        onClick={onToggleLeftDropdown}
        className="flex h-12 w-12 items-center justify-center rounded-full text-slate-500 transition-all md:hover:bg-slate-700/50 md:hover:text-white"
        aria-label="Toggle navigation"
      >
        {/* Vertical Ellipsis */}
        <FaEllipsisVertical
          size={25}
          className={`absolute transition-all duration-300 ease-in-out ${isLeftDropdownOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"} `}
        />
        {/* Horizontal Ellipsis */}
        <FaEllipsis
          size={25}
          className={`absolute transition-all duration-300 ease-in-out ${isLeftDropdownOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"} `}
        />{" "}
      </button>
      {/* The dropdown content is now always rendered */}
      <div
        className={`flex origin-top transform flex-col items-center justify-center gap-1 transition-all duration-300 ease-in-out ${isLeftDropdownOpen ? "visible scale-y-100 opacity-100" : "invisible scale-y-0 opacity-0"} `}
      >
        <button
          onClick={() => navigate("/")}
          className="flex h-12 w-12 items-center justify-center rounded-full text-slate-500 transition-all md:hover:bg-slate-700/50 md:hover:text-white"
        >
          <GoHome size={25} />
          {newPostCount > 0 && (
            <div
              className="absolute right-3.5 top-3.5 h-2 w-2 rounded-full bg-primary"
              style={{ transform: "translate(50%, -50%)" }}
            ></div>
          )}
        </button>
        <button
          onClick={() => navigate("/messages")}
          className="relative flex h-12 w-12 items-center justify-center rounded-full text-slate-500 transition-all md:hover:bg-slate-700/50 md:hover:text-white"
        >
          <CiMail size={25} strokeWidth={0.5} />
          {unreadMessageCount > 0 && (
            <div
              className="absolute right-3 top-4 z-10 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-black bg-primary px-1 text-[11px] font-bold text-white"
              style={{ transform: "translate(50%, -50%)" }}
            >
              {formatCount(unreadMessageCount)}
            </div>
          )}
        </button>
        <button
          onClick={() => navigate("/public-chat")}
          className="relative flex h-12 w-12 items-center justify-center rounded-full text-slate-500 transition-all md:hover:bg-slate-700/50 md:hover:text-white"
        >
          <BsChatDots size={24} />
          {unreadPublicChatCount > 0 && (
            <div
              className="absolute right-3 top-4 z-10 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-black bg-primary px-1 text-[11px] font-bold text-white"
              style={{ transform: "translate(50%, -50%)" }}
            >
              {formatCount(unreadPublicChatCount)}
            </div>
          )}
        </button>
      </div>
    </div>
  )
}

export default LeftDropdown
