import { useEffect, useState } from "react"
import { useAuthUser } from "../auth/authHooks/useAuthUser"
import { WARDROBE_CONFIG, CATEGORY_LABELS } from "./wardrobeConfig"
import { useEquipItem, useInventory } from "./wardrobeHooks"
import { getNameplateClass } from "../../utils/getNameplateClass"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import { FaArrowLeft, FaCheckCircle, FaLock, FaBolt, FaTrophy, FaRunning } from "react-icons/fa"
import { useNavigate } from "react-router-dom"
import UserAvatar from "../../components/common/UserAvatar"
import { BsThreeDots } from "react-icons/bs"
import FollowButton from "../../components/common/FollowButton"
import { shouldTextBeWhite } from "../../utils/shouldTextBeWhite"
import { useTheme } from "../../context/ThemeContext"
import { loadGoogleFont } from "./StyleWrapper"
import { useInView } from "react-intersection-observer"

const TABS = ["rings", "fonts", "nameplates", "overlays"]

// ── Live Preview Panel ──────────────────────────────────────────────────────
const LivePreview = ({ authUser, previewEquipped }) => {
  const ringConfig = WARDROBE_CONFIG[previewEquipped.ring]
  const overlayConfig = WARDROBE_CONFIG[previewEquipped.overlay]
  const fontConfig = WARDROBE_CONFIG[previewEquipped.font]
  const nameplateClass = getNameplateClass(previewEquipped.nameplate)

  const fontFamily = fontConfig?.cssVars?.["--user-font"] || "inherit"
  const ringClass = ringConfig?.ringClass || ""
  const overlayClass = overlayConfig?.overlayClass || ""

  return (
    <div className="flex flex-col gap-8">
      {/* 1. PROFILE CARD — unchanged */}
      <div className="flex flex-col">
        <p className="mb-2 ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Profile Look
        </p>
        <div
          className="group relative flex flex-col overflow-hidden rounded-2xl border border-accent bg-base-200 shadow-xl"
          style={{ fontFamily }}
        >
          <div className={`relative h-28 w-full shrink-0 overflow-hidden ${overlayClass}`}>
            <img
              src={authUser?.coverImg?.imageUrl || "/cover.png"}
              className="h-full w-full object-cover"
              alt="cover"
            />
          </div>
          <div className="relative flex flex-col px-4 pb-4 pt-12">
            <div className="absolute -top-10 left-4 z-20">
              <div className={`rounded-full bg-base-200 p-0.5 shadow-lg ${ringClass}`}>
                <img
                  src={authUser?.profileImg?.imageUrl || "/avatar-placeholder.png"}
                  className="h-20 w-20 rounded-full object-cover"
                  alt="avatar"
                />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-bold" style={{ color: authUser.nameColor || undefined }}>
                {authUser?.fullName}
              </span>
              <span className="text-sm text-slate-500">@{authUser?.username}</span>
              <span className="mt-2 text-xs">{authUser?.bio}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CONVERSATION ITEM PREVIEW — rewritten to match DMConversationItem exactly */}
      <div className="flex flex-col">
        <p className="mb-2 ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Inbox Preview
        </p>

        {/* Outer wrapper mirrors DMConversationItem's outermost div.
            overflow-hidden clips the ::before at the card edge.
            rounded-xl only for the preview card aesthetics. */}
        <div
          className={`relative flex cursor-default items-center gap-1 overflow-hidden border border-accent p-3 ${nameplateClass}`}
        >
          {/* Avatar + ring */}
          <div className="relative z-10 shrink-0 p-1">
            <div className={`rounded-full bg-base-200 p-0.5 shadow-md ${ringClass}`}>
              <img
                src={authUser?.profileImg?.imageUrl || "/avatar-placeholder.png"}
                className="size-8 rounded-full object-cover"
                alt="avatar"
              />
            </div>
            {/* Online dot */}
            <span className="absolute bottom-2 right-1 h-3 w-3 rounded-full border-2 border-base-100 bg-green-500" />
          </div>

          {/* Content */}
          <div className="relative z-10 flex min-w-0 flex-1 flex-col py-1">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-1">
                <span
                  className="mr-1 shrink-0 truncate font-bold"
                  style={{
                    color: authUser.nameColor || undefined,
                    fontFamily,
                  }}
                >
                  {authUser?.fullName}
                </span>
                {authUser.isVerified && (
                  <img src="/verified2.png" className="size-[15px]" alt="Verified" />
                )}
                {authUser.isGoldVerified && (
                  <img src="/gold-verified2.png" className="size-[15px]" alt="Gold" />
                )}
                <span className="min-w-0 truncate text-sm text-gray-400">
                  @{authUser?.username}
                </span>
                <span className="mx-1 shrink-0 text-xs text-gray-400">·</span>
                <span className="shrink-0 text-xs text-gray-400">just now</span>
              </div>
              <BsThreeDots className="relative z-10 shrink-0 text-gray-400" />
            </div>
            <p className="truncate text-sm italic text-gray-400">No messages yet...</p>
          </div>
        </div>

        <p className="mt-2 px-1 text-[10px] italic text-gray-400">
          * This is how other users see you in their message list.
        </p>
      </div>
    </div>
  )
}

// ── Item Card ───────────────────────────────────────────────────────────────
const ItemCard = ({
  itemKey,
  config,
  isOwned,
  isEquipped,
  isPreviewing,
  onPreview,
  onEquip,
  onUnequip,
}) => {
  useEffect(() => {
    if (config.category === "fonts" && config.googleFont) {
      loadGoogleFont(config.googleFont)
    }
  }, [config.category, config.googleFont])

  const { ref, inView } = useInView({
    threshold: 0.1, // Trigger when 10% of the card is visible
    triggerOnce: false,
  })
  

  const itemFontFamily = config.category === "fonts" ? config.cssVars?.["--user-font"] : "inherit"
  const { theme } = useTheme()

  // Logic for the badge
  const rewardBadge =
    config.rewardType === "sprint" ? (
      <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-400">
        <FaBolt size={8} /> Sprint
      </span>
    ) : config.rewardType === "marathon" ? (
      <span className="flex items-center gap-0.5 text-[10px] font-bold text-teal-400">
        <FaRunning size={10} /> Marathon
      </span>
    ) : (
      <span className="flex items-center gap-0.5 text-[10px] font-bold text-blue-400">
        <FaTrophy size={8} /> Progress
      </span>
    )

  const swatch = config.ringClass && (
    <div className="mb-1 flex justify-center">
      <div className={`h-8 w-8 rounded-full bg-slate-600 ${config.ringClass}`} />
    </div>
  )

  // Only show the small preview if it's NOT a full-card nameplate
  const npPreview = config.nameplateClass && config.category !== "nameplates" && (
    <div className="mb-1 flex justify-center">
      <span className={`text-xs ${config.nameplateClass}`}>Username</span>
    </div>
  )

  // Determine if we should apply the nameplate class to the whole card
  const isNameplateTab = config.category === "nameplates"
  // const cardNameplateClass = isNameplateTab ? config.nameplateClass : ""
  const cardNameplateClass = isNameplateTab && inView ? config.nameplateClass : ""

  return (
    <div
    ref={ref}
      className={`relative flex cursor-pointer select-none flex-col gap-1 overflow-hidden rounded-xl border p-3 transition ${cardNameplateClass} ${
        isPreviewing
          ? "border-primary bg-primary/10"
          : isEquipped
            ? "border-green-500 bg-green-500/10"
            : isOwned
              ? "border-accent bg-base-200 hover:bg-secondary"
              : "border-accent/30 bg-base-300/50 opacity-60"
      }`}
      onClick={() => onPreview(itemKey)}
    >
      {/* Z-index ensures buttons and icons stay above 
          any background effects/gradients from the nameplate 
      */}
      <div className="relative z-10 flex h-full flex-col gap-1">
        {isEquipped && (
          <FaCheckCircle className="absolute right-0 top-0 text-green-500" size={12} />
        )}
        {!isOwned && <FaLock className="absolute right-0 top-0 text-slate-500" size={12} />}

        {swatch}
        {npPreview}

        <p className={`text-sm font-bold leading-tight ${config.category === "nameplates" && "text-neutral-500"}`} style={{ fontFamily: itemFontFamily }}>
          {config.label}
        </p>

        <div className="flex items-center justify-between gap-1">
          {rewardBadge}
          <span className="truncate text-[9px] text-slate-500">{config.unlockHint}</span>
        </div>

        {isPreviewing && isOwned && (
          <div className="mt-1">
            {!isEquipped ? (
              <button
                className={`w-full rounded-full bg-primary py-0.5 text-xs font-bold ${shouldTextBeWhite(theme)}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onEquip(itemKey)
                }}
              >
                Equip
              </button>
            ) : (
              <button
                className="w-full rounded-full border border-red-500/40 bg-base-100 py-0.5 text-xs text-red-400"
                onClick={(e) => {
                  e.stopPropagation()
                  onUnequip()
                }}
              >
                Unequip
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────
const WardrobePage = () => {
  const navigate = useNavigate()
  const { authUser } = useAuthUser()
  const { inventory, equipped, isLoading } = useInventory()
  const { equipItem } = useEquipItem()

  const { theme } = useTheme()

  const [activeTab, setActiveTab] = useState("rings")
  const [previewKey, setPreviewKey] = useState(null)
  const [filterMode, setFilterMode] = useState("all") // "all" | "owned" | "progress" | "sprint"

  const SINGULAR = { fonts: "font", rings: "ring", overlays: "overlay", nameplates: "nameplate" }
  const equippedKey = SINGULAR[activeTab]

  const previewEquipped = {
    ...equipped,
    [equippedKey]: previewKey ?? equipped[equippedKey],
  }

  const handleEquip = (key) => equipItem({ category: equippedKey, itemKey: key })
  const handleUnequip = () => {
    equipItem({ category: equippedKey, itemKey: null })
    setPreviewKey(null)
  }

  const tabItems = Object.entries(WARDROBE_CONFIG)
    .filter(([, c]) => c.category === activeTab)
    .filter(([key, c]) => {
      if (filterMode === "owned") return (inventory[activeTab] || []).includes(key)
      if (filterMode === "progress") return c.rewardType === "progress"
      if (filterMode === "sprint") return c.rewardType === "sprint"
      if (filterMode === "marathon") return c.rewardType === "marathon"
      return true
    })

  const isTabLocked = (tab) => tab !== "rings" && tab !== "fonts" && tab !== "nameplates"
 
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  return (
    <div className="template min-h-screen flex-1 border-r border-accent">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center gap-3 border-b border-accent bg-base-100/80 px-4 py-3 backdrop-blur-md">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-2 transition hover:bg-secondary"
        >
          <FaArrowLeft size={16} />
        </button>
        <h1 className="flex-1 text-lg font-bold">Profile Wardrobe</h1>
        <span className="text-xs text-slate-400">Changes apply instantly</span>
      </div>

      <div className="mx-auto mt-2 flex flex-col gap-6 p-4 md:flex-row md:items-start">
        {/* Left: Live Preview (sticky on desktop) */}
        <div className="w-full md:sticky md:top-20 md:w-96 md:flex-shrink-0">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            Live Preview
          </p>
          <LivePreview
            authUser={authUser}
            previewEquipped={previewEquipped}
            activeTab={activeTab}
          />

          {/* Currently equipped summary */}
          <div className="mt-3 rounded-xl border border-accent bg-base-200 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Equipped
            </p>
            {["ring", "overlay", "font", "nameplate"].map((cat) => (
              <div key={cat} className="flex items-center justify-between py-0.5">
                <span className="text-xs capitalize text-slate-500">{cat}</span>
                <span className="text-xs font-semibold">
                  {equipped[cat] ? (
                    WARDROBE_CONFIG[equipped[cat]]?.label || equipped[cat]
                  ) : (
                    <span className="text-slate-600">None</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Selector */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">

          <div className="flex gap-1 rounded-xl bg-base-200 p-1">
            {TABS.map((tab) => {
              const locked = isTabLocked(tab)
              return (
                <button
                  key={tab}
                  disabled={locked}
                  className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-bold transition ${
                    activeTab === tab
                      ? `bg-primary ${shouldTextBeWhite(theme)}`
                      : locked
                        ? "cursor-not-allowed text-slate-500 opacity-40"
                        : "text-slate-400 hover:text-base-content"
                  }`}
                  onClick={() => {
                    setActiveTab(tab)
                    setPreviewKey(null)
                  }}
                >
                  {CATEGORY_LABELS[tab]}
                  {locked && <FaLock size={8} />}
                </button>
              )
            })}
          </div>

          {/* Filter strip — clearly distinguishes reward types */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500">Show:</span>
            {["all", "owned", "progress", "sprint", "marathon"].map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`rounded-full px-3 py-0.5 text-xs font-bold transition ${
                  filterMode === mode
                    ? `bg-primary ${shouldTextBeWhite(theme)}`
                    : "bg-base-200 text-slate-400 hover:bg-secondary"
                }`}
              >
                {mode === "all" ? (
                  "All"
                ) : mode === "owned" ? (
                  "Owned"
                ) : mode === "progress" ? (
                  <span className="flex items-center gap-1">
                    <FaTrophy size={9} /> Progress
                  </span>
                ) : mode === "sprint" ? (
                  <span className="flex items-center gap-1">
                    <FaBolt size={9} /> Sprint
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <FaRunning size={10} /> Marathon
                  </span>
                )}
              </button>
            ))}
          </div>


          {/* Item grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3">
            {tabItems.map(([key, config]) => {
              const isOwned = (inventory[activeTab] || []).includes(key)
              const isEquipped = equipped[equippedKey] === key
              return (
                <ItemCard
                  key={key}
                  itemKey={key}
                  config={config}
                  isOwned={isOwned}
                  isEquipped={isEquipped}
                  isPreviewing={previewKey === key}
                  onPreview={setPreviewKey}
                  onEquip={handleEquip}
                  onUnequip={handleUnequip}
                />
              )
            })}
            {tabItems.length === 0 && (
              <p className="col-span-4 py-8 text-center text-sm text-slate-500">
                No items match this filter.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WardrobePage
