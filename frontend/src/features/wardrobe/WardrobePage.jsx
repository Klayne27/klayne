import { useState } from "react"
import { WARDROBE_CONFIG, CATEGORY_LABELS } from "./wardrobeConfig"
import { useAuthUser } from "../auth/authHooks/useAuthUser"
import LoadingSpinner from "../../components/common/LoadingSpinner"
import { FaCheckCircle, FaLock } from "react-icons/fa"
import { IoClose } from "react-icons/io5"
import { useEquipItem, useInventory } from "./wardrobeHooks"

const TABS = ["fonts", "rings", "overlays"]

// Simulated preview user — shows what the profile card would look like
const PreviewCard = ({ previewEquipped, authUser }) => {
  const ringConfig = previewEquipped.ring ? WARDROBE_CONFIG[previewEquipped.ring] : null
  const ringClass = ringConfig?.ringClass || ""

  const fontVar = previewEquipped.font
    ? WARDROBE_CONFIG[previewEquipped.font]?.cssVars?.["--user-font"]
    : "inherit"

  return (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl border border-accent bg-base-200 p-5"
      style={{ fontFamily: fontVar }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Preview</p>
      <div className={`rounded-full ${ringClass}`}>
        <img
          src={authUser?.profileImg?.imageUrl || "/avatar-placeholder.png"}
          className="h-16 w-16 rounded-full object-cover"
          alt="preview"
        />
      </div>
      <div className="text-center">
        <p className="font-bold">{authUser?.fullName}</p>
        <p className="text-sm text-slate-400">@{authUser?.username}</p>
        <p className="mt-1 text-xs text-slate-500">
          {previewEquipped.theme ? WARDROBE_CONFIG[previewEquipped.theme]?.label : "Default theme"}
          {" · "}
          {previewEquipped.font ? WARDROBE_CONFIG[previewEquipped.font]?.label : "Default font"}
        </p>
      </div>
    </div>
  )
}

const ItemCard = ({
  itemKey,
  config,
  isOwned,
  isEquipped,
  isPreviewing,
  onPreview,
  onEquip,
  onUnequip,
}) => (
  <div
    className={`relative flex cursor-pointer flex-col gap-2 rounded-xl border p-3 transition ${
      isPreviewing
        ? "border-primary bg-primary/10"
        : isEquipped
          ? "border-green-500 bg-green-500/10"
          : isOwned
            ? "border-accent bg-base-200 hover:bg-secondary"
            : "cursor-not-allowed border-accent/40 bg-base-300 opacity-50"
    }`}
    onClick={() => isOwned && onPreview(itemKey)}
  >
    {isEquipped && <FaCheckCircle className="absolute right-2 top-2 text-green-500" size={14} />}
    {!isOwned && <FaLock className="absolute right-2 top-2 text-slate-500" size={14} />}

    {/* Ring preview swatch */}
    {config.ringClass && (
      <div className="flex justify-center py-2">
        <div className={`h-10 w-10 rounded-full bg-slate-600 ${config.ringClass}`} />
      </div>
    )}

    <p className="text-sm font-semibold">{config.label}</p>
    {config.preview && <p className="text-xs text-slate-400">{config.preview}</p>}

    {isOwned && isPreviewing && (
      <div className="mt-1 flex gap-2">
        {!isEquipped ? (
          <button
            className="flex-1 rounded-full bg-primary py-1 text-xs font-bold text-white"
            onClick={(e) => {
              e.stopPropagation()
              onEquip(itemKey)
            }}
          >
            Equip
          </button>
        ) : (
          <button
            className="flex-1 rounded-full border border-red-500/40 py-1 text-xs text-red-500"
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

const WardrobePage = ({ onClose }) => {
  const { authUser } = useAuthUser()
  const { inventory, equipped, isLoading } = useInventory()
  const { equipItem, isEquipping } = useEquipItem()

  const [activeTab, setActiveTab] = useState("themes")
  const [previewKey, setPreviewKey] = useState(null)

  // Build a merged "preview" equipped state
  const CATEGORY_TO_SINGULAR = {
    fonts: "font",
    rings: "ring",
    overlays: "overlay",
  }
  const equippedKey = CATEGORY_TO_SINGULAR[activeTab]
  const previewEquipped = {
    ...equipped,
    [equippedKey]: previewKey ?? equipped[equippedKey],
  }

  const handleEquip = (itemKey) => {
    equipItem({ category: equippedKey, itemKey })
  }

  const handleUnequip = () => {
    equipItem({ category: equippedKey, itemKey: null })
    setPreviewKey(null)
  }

  // All items for this tab from the config
  const tabItems = Object.entries(WARDROBE_CONFIG).filter(
    ([, config]) => config.category === activeTab,
  )

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-accent bg-base-100 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Wardrobe</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-secondary">
            <IoClose size={20} />
          </button>
        </div>

        <div className="flex gap-4">
          {/* Left: tabs + item grid */}
          <div className="flex flex-1 flex-col gap-3 overflow-hidden">
            {/* Tabs */}
            <div className="flex gap-1 rounded-xl bg-base-200 p-1">
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
            </div>

            {/* Item grid */}
            <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1">
              {tabItems.map(([key, config]) => {
                const ownedList = inventory[activeTab] || []
                const isOwned = ownedList.includes(key)
                const isEquipped = equipped[equippedKey] === key
                const isPreviewing = previewKey === key

                return (
                  <ItemCard
                    key={key}
                    itemKey={key}
                    config={config}
                    isOwned={isOwned}
                    isEquipped={isEquipped}
                    isPreviewing={isPreviewing}
                    onPreview={setPreviewKey}
                    onEquip={handleEquip}
                    onUnequip={handleUnequip}
                  />
                )
              })}
            </div>
          </div>

          {/* Right: preview card */}
          <div className="w-44 flex-shrink-0">
            <PreviewCard previewEquipped={previewEquipped} authUser={authUser} />
            <p className="mt-2 text-center text-xs text-slate-500">
              Click an item to preview, then equip.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WardrobePage
