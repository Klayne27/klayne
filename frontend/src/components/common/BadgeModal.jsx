import { FaTimes } from "react-icons/fa"
import { useUpdatePreferredBadge } from "../../features/users/usersHooks/useUpdatePreferredBadge"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"

const BadgeModal = ({ badge, onClose }) => {
  const { authUser } = useAuthUser()
  const { updateBadge } = useUpdatePreferredBadge()

  if (!badge || !authUser) return null // Check if the current badge is the one the user has chosen to display

  const isCurrentlyDisplayed = authUser.preferredBadge === badge.name

  const handleToggleDisplay = () => {
    // If the badge is currently displayed, remove it. Otherwise, set it.
    const newPreferredBadge = isCurrentlyDisplayed ? null : badge.name
    updateBadge(newPreferredBadge)
    onClose() // Optional: Close the modal after the action is taken
  }

  const getBadgeIconLarge = (badgeName) => {
    // A larger version of your existing badge icon logic
    switch (badgeName) {
      case "twentyfive-hour-scholar":
        return <img src="/badge-hrs-25.png" alt="25 Hour Scholar" className="size-24" />
      case "onehundred-hour-scholar":
        return <img src="/badge-hrs-100.png" alt="100 Hour Scholar" className="size-24" />
      case "three-hundred-hour-master":
        return <img src="/badge-hrs-300.png" alt="300 Hour Master" className="size-24" />
      case "ten-sessions-achiever":
        return <img src="/badge-sessions-10.png" alt="10 Sessions Achiever" className="size-24" />
      case "fifty-sessions-pro":
        return <img src="/badge-sessions-50.png" alt="50 Sessions Pro" className="size-24" />
      case "session-master":
        return <img src="/badge-sessions-150.png" alt="Session Master" className="size-24" />
      case "seven-day-streak":
        return <img src="/badge-streak-7.png" alt="7 Day Streak" className="size-24" />
      case "fourteen-day-streak":
        return <img src="/badge-streak-14.png" alt="14 Day Streak" className="size-24" />
      case "thirty-day-streak":
        return <img src="/badge-streak-30.png" alt="30 Day Streak" className="size-24" />
      case "august-2025-1st":
        return <img src="/badge-august2025-1st.png" alt="August 2025 1st" className="size-24" />
      case "august-2025-2nd":
        return <img src="/badge-august2025-2nd.png" alt="August 2025 2nd" className="size-24" />
      case "august-2025-3rd":
        return <img src="/badge-august2025-3rd.png" alt="August 2025 3rd" className="size-24" />
      default:
        return null
    }
  } // Define a description for each badge

  const getBadgeDescription = (badgeName) => {
    switch (badgeName) {
      case "twentyfive-hour-scholar":
        return "You've logged 25 hours of focused study time. Keep it up!"
      case "onehundred-hour-scholar":
        return "You are a true scholar! 100 hours of dedication unlocked."
      case "three-hundred-hour-master":
        return "A master of your craft. You've achieved 300 hours of deep work."
      case "ten-sessions-achiever":
        return "Completed 10 study sessions. You're building a strong habit."
      case "fifty-sessions-pro":
        return "50 sessions strong. Your consistency is paying off."
      case "session-master":
        return "150 sessions completed. Your discipline is an inspiration."
      case "seven-day-streak":
        return "Focused for a full week. You've got momentum!"
      case "fourteen-day-streak":
        return "Two weeks of consistent study. You're unstoppable."
      case "thirty-day-streak":
        return "Thirty days of dedication. A testament to your discipline."
      case "august-2025-1st":
        return "You've earned the August Gold Trophy! This badge is the ultimate recognition of your achievement this month. Your dedication is truly inspiring!"
      case "august-2025-2nd":
        return "You've earned the August Silver Trophy! Your commitment this month was exceptional. This badge is a symbol of your impressive hard work and discipline."
      case "august-2025-3rd":
        return "You've earned the August Bronze Trophy! This is a testament to your consistent effort and dedication throughout the month. Keep up the great work!"
      default:
        return "A well-deserved badge for your hard work."
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center rounded-xl bg-black bg-opacity-75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="absolute bottom-0 rounded-xl bg-slate-800 p-6 text-center shadow-2xl md:relative md:h-full md:w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-400 hover:text-white"
        >
          <FaTimes size={20} />
        </button>
        <div className="mb-4 flex justify-center">{getBadgeIconLarge(badge.name)}</div>
        <h3 className="mb-2 text-xl font-bold">{badge.displayName}</h3>
        <p className="text-sm text-neutral-400">{getBadgeDescription(badge.name)}</p>
        <button
          onClick={handleToggleDisplay}
          className={`mt-4 md:absolute md:top-0 md:left-4 rounded-lg px-4 py-2 font-semibold text-white transition-colors ${
            isCurrentlyDisplayed ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/85"
          }`}
        >
          {isCurrentlyDisplayed ? "Remove" : "Display"}
        </button>
      </div>
    </div>
  )
}

export default BadgeModal
