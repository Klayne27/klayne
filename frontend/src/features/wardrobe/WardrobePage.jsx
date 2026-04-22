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
      {/* 1. PROFILE CARD */}
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
            <div className="absolute right-2 top-3">
              <FollowButton />
            </div>
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
              <div className="flex justify-between">
                <span className="font-bold" style={{ color: authUser.nameColor || undefined }}>
                  {authUser?.fullName}
                </span>
              </div>
              <span className="text-sm text-slate-500">@{authUser?.username}</span>
              <span className="mt-2 text-xs">{authUser?.bio}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CONVERSATION ITEM PREVIEW (Fixed to match Profile Info logic) */}
      <div className="flex flex-col">
        <p className="mb-2 ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Inbox Preview
        </p>
        {/* Main Container: No overflow-hidden so the ring can pop out */}
        <div className="relative flex items-center gap-2 p-4">
          {/* THE NAMEPLATE BACKGROUND: Absolutely positioned and clipped */}
          <div
            className={`absolute inset-0 z-0 overflow-hidden border border-accent ${nameplateClass}`}
          />

          {/* AVATAR: Higher z-index to sit above the nameplate background */}
          <div className="relative z-10">
            <div className={`rounded-full bg-base-200 p-0.5 shadow-md ${ringClass}`}>
              <img
                src={authUser?.profileImg?.imageUrl || "/avatar-placeholder.png"}
                className="size-8 rounded-full object-cover"
                alt="avatar"
              />
            </div>
          </div>

          {/* CONTENT: Higher z-index and flex-1 to push BSThreeDots to the right */}
          <div className="relative z-10 flex min-w-0 flex-1 flex-col py-1">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-1">
                <span
                  className="min-w-0 flex-shrink-0 truncate font-bold"
                  style={{
                    color: authUser.nameColor || undefined,
                    // Apply the dynamic font family here
                    fontFamily: fontConfig?.cssVars?.["--user-font"] || "inherit",
                  }}
                >
                  {authUser?.fullName}
                </span>
                {authUser.isVerified && (
                  <img src="/verified2.png" className="size-[17px]" alt="Verified" />
                )}
                {authUser.isGoldVerified && (
                  <img src="/gold-verified2.png" className="size-[17px]" alt="Gold Verified" />
                )}
                {authUser.isCha && <img src="/cha.png" className="size-[15px] rounded-md" />}

                <span className="min-w-0 truncate text-sm text-gray-400">
                  @{authUser?.username}
                </span>
                {authUser?.isVerified && (
                  <img src="/verified2.png" className="size-[17px]" alt="Verified" />
                )}
                <span className="shrink-0 text-[10px] text-gray-400">· 27m</span>
              </div>
              <BsThreeDots className="shrink-0 text-gray-400" />
            </div>
            <p className="truncate text-xs text-gray-400">No messages yet...</p>
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
  // --- ADD THIS: Load font for the card preview ---
  useEffect(() => {
    if (config.category === "fonts" && config.googleFont) {
      loadGoogleFont(config.googleFont)
    }
  }, [config.category, config.googleFont])

  // Determine font family for the label
  const itemFontFamily = config.category === "fonts" ? config.cssVars?.["--user-font"] : "inherit"
  // ------------------------------------------------

  const rewardBadge =
    config.rewardType === "sprint" ? (
      <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-400">
        <FaBolt size={8} />
        Sprint
      </span>
    ) : config.rewardType === "marathon" ? (
      <span className="flex items-center gap-0.5 text-[10px] font-bold text-teal-400">
        <FaRunning size={10} /> Marathon
      </span>
    ) : (
      <span className="flex items-center gap-0.5 text-[10px] font-bold text-blue-400">
        <FaTrophy size={8} />
        Progress
      </span>
    )

  // Swatches... (keep existing ring/nameplate logic)
  const swatch = config.ringClass && (
    <div className="mb-1 flex justify-center">
      <div className={`h-8 w-8 rounded-full bg-slate-600 ${config.ringClass}`} />
    </div>
  )

  const npPreview = config.nameplateClass && (
    <div className="mb-1 flex justify-center">
      <span className={`text-xs ${config.nameplateClass}`}>Username</span>
    </div>
  )

  const { theme } = useTheme()

  return (
    <div
      className={`relative flex cursor-pointer select-none flex-col gap-1 rounded-xl border p-3 transition ${
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
      {isEquipped && <FaCheckCircle className="absolute right-2 top-2 text-green-500" size={12} />}
      {!isOwned && <FaLock className="absolute right-2 top-2 text-slate-500" size={12} />}

      {swatch}
      {npPreview}

      {/* --- MODIFIED: Apply the dynamic font family to the label --- */}
      <p className="text-sm font-bold leading-tight" style={{ fontFamily: itemFontFamily }}>
        {config.label}
      </p>
      {/* --------------------------------------------------------- */}

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
              className="w-full rounded-full border border-red-500/40 py-0.5 text-xs text-red-400"
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

  const isTabLocked = (tab) => tab !== "rings" && tab !== "fonts"

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
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-accent bg-base-100/80 px-4 py-3 backdrop-blur-md">
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
          {/* Category tabs */}
          {/* <div className="flex gap-1 rounded-xl bg-base-200 p-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                  activeTab === tab
                    ? "bg-primary text-white"
                    : "text-slate-400 hover:text-base-content"
                }`}
                onClick={() => {
                  setActiveTab(tab)
                  setPreviewKey(null)
                }}
              >
                {CATEGORY_LABELS[tab]}
              </button>
            ))}
          </div> */}
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
          <div className="flex items-center gap-2">
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

          {/* Reward type legend */}
          {/* <div className="flex gap-4 rounded-xl border border-accent bg-base-200/50 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <FaTrophy size={10} className="text-blue-400" />
              <span className="text-xs text-slate-400">
                <strong className="text-blue-400">Progress</strong> — permanent unlocks from
                level/total hours
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <FaBolt size={10} className="text-amber-400" />
              <span className="text-xs text-slate-400">
                <strong className="text-amber-400">Sprint</strong> — requires weekly/monthly effort
                to keep
              </span>
            </div>
          </div> */}

          {/* Item grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
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
