import { useState } from "react"
import { FaTrophy } from "react-icons/fa6"
import BadgeModal from "./BadgeModal"
import { badgeTiers, getBadgeIconDisplay } from "../../utils/badgeUtils.jsx"

const Badge = ({ badge, onOpenModal }) => (
  <button
    onClick={() => onOpenModal(badge)}
    className="flex flex-col items-center rounded-lg bg-base-300 p-1 transition-colors hover:bg-secondary md:p-2"
  >
    <div className="flex size-8 items-center justify-center">{getBadgeIconDisplay(badge.name)}</div>
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
    const categoryOrder = ["trophy", "wordle", "hour", "session", "streak"]
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
