import { useState, useCallback } from "react"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { useUpdateNameColor } from "../../features/users/usersHooks/useUserMutations"

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f59e0b", // amber
  "#06b6d4", // cyan
]

const NameColorPicker = () => {
  const { authUser } = useAuthUser()
  const { updateNameColor, isUpdatingNameColor } = useUpdateNameColor()
  const [localColor, setLocalColor] = useState(authUser?.nameColor || "")

  const handlePresetClick = useCallback(
    (color) => {
      setLocalColor(color)
      updateNameColor(color)
    },
    [updateNameColor],
  )

  const handleCustomColorChange = useCallback((e) => {
    setLocalColor(e.target.value)
  }, [])

  // Only save on blur/commit — not on every picker drag
  const handleCustomColorCommit = useCallback(
    (e) => {
      updateNameColor(e.target.value)
    },
    [updateNameColor],
  )

//   const handleReset = useCallback(() => {
//     setLocalColor("#ffffff")
//     updateNameColor(null)
//   }, [updateNameColor])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-bold"
            style={authUser.nameColor ? { color: authUser.nameColor } : undefined}
          >
            {authUser?.fullName}
          </span>
          <span className="text-xs text-base-content/50">preview</span>
        </div>
      </div>

      {/* Preset swatches */}
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => handlePresetClick(color)}
            disabled={isUpdatingNameColor}
            className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 disabled:cursor-not-allowed"
            style={{
              backgroundColor: color,
              borderColor: localColor === color ? "white" : "transparent",
            }}
            title={color}
          />
        ))}

        {/* Custom color input */}
        <label
          className="relative flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-base-content/30 text-xs hover:border-base-content/60"
          title="Custom color"
        >
          <span className="pointer-events-none text-base-content/50">+</span>
          <input
            type="color"
            value={localColor}
            onChange={handleCustomColorChange}
            onBlur={handleCustomColorCommit}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  )
}

export default NameColorPicker
