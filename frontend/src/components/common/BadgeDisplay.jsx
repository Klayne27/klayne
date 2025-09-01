import { useState } from "react"
import { FaTrophy } from "react-icons/fa6"
import BadgeModal from "./BadgeModal"

export const badgeTiers = {
  "ten-sessions-achiever": { tier: 1, category: "session", displayName: "10 Sessions Achiever" },
  "fifty-sessions-pro": { tier: 2, category: "session", displayName: "50 Sessions Pro" },
  "session-master": { tier: 3, category: "session", displayName: "Session Master" },
  "twentyfive-hour-scholar": { tier: 1, category: "hour", displayName: "25 Hour Scholar" },
  "onehundred-hour-scholar": { tier: 2, category: "hour", displayName: "100 Hour Scholar" },
  "three-hundred-hour-master": { tier: 3, category: "hour", displayName: "300 Hour Master" },
  "seven-day-streak": { tier: 1, category: "streak", displayName: "7 Day Streak" },
  "fourteen-day-streak": { tier: 2, category: "streak", displayName: "14 Day Streak" },
  "thirty-day-streak": { tier: 3, category: "streak", displayName: "30 Day Streak" },
  "august-2025-1st": { tier: 3, category: "trophy", displayName: "1st - August 2025" },
  "august-2025-2nd": { tier: 3, category: "trophy", displayName: "2nd - August 2025" },
  "august-2025-3rd": { tier: 3, category: "trophy", displayName: "3rd - August 2025" },
}

const getBadgeIcon = (badgeName) => {
  switch (badgeName) {
    case "twentyfive-hour-scholar":
      return <img src="/badge-hrs-25.png" alt="25 Hour Scholar" className="size-full" />
    case "onehundred-hour-scholar":
      return <img src="/badge-hrs-100.png" alt="100 Hour Scholar" className="size-full" />
    case "three-hundred-hour-master":
      return <img src="/badge-hrs-300.png" alt="300 Hour Master" className="size-full" />
    case "ten-sessions-achiever":
      return <img src="/badge-sessions-10.png" alt="10 Sessions Achiever" className="size-full" />
    case "fifty-sessions-pro":
      return <img src="/badge-sessions-50.png" alt="50 Sessions Pro" className="size-full" />
    case "session-master":
      return <img src="/badge-sessions-150.png" alt="Session Master" className="size-full" />
    case "seven-day-streak":
      return <img src="/badge-streak-7.png" alt="7 Day Streak" className="size-full" />
    case "fourteen-day-streak":
      return <img src="/badge-streak-14.png" alt="14 Day Streak" className="size-full" />
    case "thirty-day-streak":
      return <img src="/badge-streak-30.png" alt="30 Day Streak" className="size-full" />
    case "august-2025-1st":
      return <img src="/badge-august2025-1st.png" alt="August 2025 1st" className="size-full" />
    case "august-2025-2nd":
      return <img src="/badge-august2025-2nd.png" alt="August 2025 2nd" className="size-full" />
    case "august-2025-3rd":
      return <img src="/badge-august2025-3rd.png" alt="August 2025 3rd" className="size-full" />
    default:
      return null
  }
}

const Badge = ({ badge, onOpenModal }) => (
  <button
    onClick={() => onOpenModal(badge)}
    className="flex flex-col items-center rounded-lg bg-base-300 p-1 transition-colors hover:bg-secondary md:p-2"
  >
    <div className="flex size-8 items-center justify-center">{getBadgeIcon(badge.name)}</div>
  </button>
)

const BadgeDisplay = ({ badges }) => {
  const [selectedBadge, setSelectedBadge] = useState(null)

  if (!badges || badges.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <FaTrophy className="text-3xl text-neutral-600" />
        <p className="mt-2 text-sm text-neutral-500">No badges yet!</p>
      </div>
    )
  }

  const validBadges = badges
    .map((badgeName) => ({
      ...badgeTiers[badgeName],
      name: badgeName,
    }))
    .filter((badge) => badge.tier)

  validBadges.sort((a, b) => {
    if (a.tier !== b.tier) {
      return a.tier - b.tier
    }
    const categoryOrder = ["trophy", "hour", "session", "streak"]
    return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)
  })

  return (
    <>
      <div className="grid grid-cols-6 gap-2 overflow-auto p-2">
        {validBadges.map((badge) => (
          <Badge key={badge.name} badge={badge} onOpenModal={setSelectedBadge} />
        ))}
      </div>
      <BadgeModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
    </>
  )
}

export default BadgeDisplay
