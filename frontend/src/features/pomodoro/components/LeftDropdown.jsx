import { CiMail } from "react-icons/ci"
import { FaEllipsisVertical } from "react-icons/fa6"
import { useNavigate } from "react-router-dom"
import { formatCount } from "../../../utils/textUtils"
import { useSocket } from "../../../context/SocketContext"
import { GoHome } from "react-icons/go"
import { IoChatbubblesOutline } from "react-icons/io5"

function LeftDropdown({ onToggleLeftDropdown, isLeftDropdownOpen }) {
  const navigate = useNavigate()
  const { unreadMessageCount, unreadPublicChatCount, newPostCount } = useSocket()

  const Badge = ({ count, isDot = false }) => {
    if (count <= 0) return null
    return (
      <div
        className={`absolute -right-1 -top-1 z-10 flex items-center justify-center rounded-full border-2 border-base-100 bg-primary font-bold ${isDot ? "h-3 w-3" : "h-5 min-w-[1.25rem] px-1 text-[10px]"}`}
      >
        {!isDot && formatCount(count)}
      </div>
    )
  }

  return (
    <div className="fixed left-1 top-24 md:left-6 md:top-32 z-40 flex flex-col items-center gap-3">
      <button
        onClick={onToggleLeftDropdown}
        className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg transition-all duration-300 ${isLeftDropdownOpen ? " bg-primary " : "bg-base-200 text-slate-400 hover:text-white"}`}
      >
        <FaEllipsisVertical
          size={20}
          className={`transition-transform duration-500 ${isLeftDropdownOpen ? "rotate-180" : "rotate-0"}`}
        />
      </button>
      {/* The Dock */}
      <div
        className={`flex flex-col gap-3 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isLeftDropdownOpen ? "translate-x-0 scale-100 opacity-100" : "pointer-events-none -translate-x-12 scale-95 opacity-0"}`}
      >
        {[
          {
            icon: <GoHome size={24} />,
            path: "/",
            badge: <Badge count={newPostCount} isDot />,
            label: "Home",
          },
          {
            icon: <CiMail size={24} />,
            path: "/messages",
            badge: <Badge count={unreadMessageCount} />,
            label: "Messages",
          },
          {
            icon: <IoChatbubblesOutline size={22} />,
            path: "/public-chat",
            badge: <Badge count={unreadPublicChatCount} />,
            label: "Public Chat",
          },
        ].map((item, i) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{ transitionDelay: `${i * 50}ms` }}
            className="group relative flex h-12 w-12 items-center justify-center rounded-2xl bg-base-200/80  backdrop-blur-md transition-all hover:bg-primary hover:shadow-[0_0_15px_rgba(var(--p),0.4)]"
          >
            {item.icon}
            {item.badge}
            {/* Tooltip */}
            <span className="absolute left-14 hidden whitespace-nowrap rounded-md bg-slate-800 text-white px-2 py-1 text-xs group-hover:block">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default LeftDropdown
