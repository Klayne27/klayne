import { useNavigate, useLocation } from "react-router-dom"
import { CiMail, CiTrophy } from "react-icons/ci"
import { GoBell, GoHome } from "react-icons/go"
import { IoChatbubblesOutline } from "react-icons/io5"
import { LuListTodo } from "react-icons/lu"
import { MdOutlineLibraryBooks } from "react-icons/md"
import { useSocket } from "../../../context/SocketContext"
import { formatCount } from "../../../utils/textUtils"
import { PiCoatHanger } from "react-icons/pi"
import { shouldTextBeWhite } from "../../../utils/shouldTextBeWhite"
import { useTheme } from "../../../context/ThemeContext"

// const Badge = ({ count }) => {
//   const { theme } = useTheme()
//   if (!count || count <= 0) return null
//   return (
//     <div
//       className={`border-full absolute ${shouldTextBeWhite(theme)} -right-3 -top-3 z-10 flex h-4 min-w-[1.1rem] items-center justify-center rounded-full border-white/20 bg-primary px-1 text-[9px] font-black shadow-sm ring-1 ring-black/20`}
//     >
//       {formatCount(count)}
//     </div>
//   )
// }

const NavItem = ({ icon, path, label, badge, navigate }) => {
  const location = useLocation()
  const isActive = location.pathname === path

  return (
    <button
      onClick={() => navigate(path)}
      className={`group relative flex size-10 items-center justify-center rounded-xl transition-all duration-300 md:size-11 ${
        isActive
          ? "bg-white/15 text-primary shadow-[inset_0_0_10px_rgba(255,255,255,0.1)] outline outline-1 outline-white/20"
          : "text-slate-500 hover:scale-110 hover:bg-white/10 active:scale-95"
      }`}
      title={label}
    >
      <div className="relative text-slate-400 transition-transform duration-200 group-hover:-translate-y-0.5 md:group-hover:-translate-y-0 md:group-hover:translate-x-0.5">
        {icon}
        {badge}
      </div>

      {/* Responsive Tooltip: Top for mobile, Right for desktop */}
      <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900/90 px-2 py-1 text-[11px] font-bold text-white opacity-0 shadow-xl backdrop-blur-md transition-all duration-200 group-hover:-translate-y-1 group-hover:opacity-100 md:left-full md:top-1/2 md:ml-3 md:-translate-x-0 md:-translate-y-1/2 md:group-hover:translate-x-1 md:group-hover:translate-y-[-50%]">
        {label}
      </span>
    </button>
  )
}

function FloatingNav() {
  const navigate = useNavigate()
  const { unreadMessageCount, unreadPublicChatCount, newPostCount, unreadNotificationsCount } =
    useSocket()

  const socialItems = [
    { icon: <GoHome size={22} />, 
      path: "/", 
      label: "Home", 
      // badge: <Badge count={newPostCount} /> 
    },
    {
      icon: <GoBell size={22} />,
      path: "/notifications",
      label: "Notifications",
      // badge: <Badge count={unreadNotificationsCount} />,
    },
    {
      icon: <CiMail size={24} />,
      path: "/messages",
      label: "Messages",
      // badge: <Badge count={unreadMessageCount} />,
    },
    {
      icon: <IoChatbubblesOutline size={22} />,
      path: "/public-chat",
      label: "Public Chat",
      // badge: <Badge count={unreadPublicChatCount} />,
    },
  ]

  const studyItems = [
    { icon: <LuListTodo size={22} />, path: "/todos", label: "Tasks" },
    { icon: <CiTrophy size={24} />, path: "/study-leaderboard", label: "Leaderboard" },
    { icon: <MdOutlineLibraryBooks size={22} />, path: "/study-activity", label: "Activity" },
    { icon: <PiCoatHanger size={22} />, path: "/wardrobe", label: "Wardrobe" },
  ]

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 md:bottom-auto md:left-6 md:top-1/2 md:-translate-y-1/2 md:translate-x-0">
      <div className="flex flex-row items-center rounded-2xl border border-white/20 bg-white/[0.03] p-0.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl before:absolute before:inset-0 before:-z-10 before:rounded-2xl before:bg-gradient-to-b before:from-white/[0.08] before:to-transparent md:flex-col md:gap-1.5 md:p-1.5">
        {socialItems.map((item) => (
          <NavItem key={item.path} {...item} navigate={navigate} />
        ))}

        {/* Responsive Glass Divider */}
        <div className="mx-1 h-7 w-[1.5px] bg-gradient-to-b from-transparent via-slate-400 to-transparent md:mx-0 md:my-1 md:h-[1.5px] md:w-7 md:bg-gradient-to-r" />

        {studyItems.map((item) => (
          <NavItem key={item.path} {...item} navigate={navigate} />
        ))}
      </div>
    </div>
  )
}

export default FloatingNav
