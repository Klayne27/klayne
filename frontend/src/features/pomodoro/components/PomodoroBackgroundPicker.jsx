import { useEffect, useRef } from "react"
import { IoCheckmark } from "react-icons/io5"
import { LuImagePlus } from "react-icons/lu"
import { MdOutlineHideImage } from "react-icons/md"
import LoadingSpinner from "../../../components/common/LoadingSpinner"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { showAppToast } from "../../../utils/showAppToast"
import {
  useRemovePomodoroBackground,
  useSetPomodoroBackground,
} from "../../users/usersHooks/useUserMutations"
import { POMODORO_PRESETS } from "../../../constants/pomodoroPresets"

const PomodoroBackgroundPicker = ({ isOpen, onClose, anchorRef }) => {
  const { authUser } = useAuthUser()
  const { setBackground, isSettingBackground } = useSetPomodoroBackground()
  const { removeBackground, isRemovingBackground } = useRemovePomodoroBackground()
  const panelRef = useRef(null)
  const fileRef = useRef(null)

  const activePreset = authUser?.pomodoroBackground
  const activeCustomUrl = authUser?.pomodoroBackgroundUrl
  const hasBackground = !!(activePreset || activeCustomUrl)
  const isBusy = isSettingBackground || isRemovingBackground

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        anchorRef?.current &&
        !anchorRef.current.contains(e.target)
      ) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [isOpen, onClose, anchorRef])

  const handlePreset = (key) => {
    if (!isBusy) setBackground({ presetKey: key })
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
      showAppToast("Only JPEG, PNG, or WebP images are allowed.", "error")
      e.target.value = ""
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showAppToast("Image must be under 5 MB.", "error")
      e.target.value = ""
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => setBackground({ customImage: ev.target.result }, { onSuccess: onClose })
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-accent/30 bg-base-200/95 p-3 shadow-2xl backdrop-blur-md"
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between px-0.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Background
        </span>
        {hasBackground && (
          <button
            onClick={() => {
              removeBackground()
              onClose()
            }}
            disabled={isBusy}
            className="flex items-center gap-1 text-[10px] font-bold text-error/60 transition hover:text-error disabled:opacity-40"
          >
            <MdOutlineHideImage size={12} />
            Remove
          </button>
        )}
      </div>

      {/* Preset list — text only, no preview */}
      <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto pr-0.5">
        {POMODORO_PRESETS.map((preset) => {
          const isActive = activePreset === preset.key && !activeCustomUrl
          return (
            <button
              key={preset.key}
              onClick={() => handlePreset(preset.key)}
              disabled={isBusy}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/15 text-primary"
                  : " hover:bg-secondary/50"
              } disabled:opacity-40`}
            >
              <span>{preset.label}</span>
              {isActive && <IoCheckmark size={14} className="shrink-0 text-primary" />}
            </button>
          )
        })}
      </div>

      {/* Custom upload */}
      <div className="mt-2 border-t border-accent/20 pt-2">
        {activeCustomUrl && activeCustomUrl !== "pending" && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-primary">Custom — active</p>
              <p className="truncate text-[9px] text-slate-500">Tap upload to replace</p>
            </div>
          </div>
        )}

        <button
          onClick={() => !isBusy && fileRef.current?.click()}
          disabled={isBusy}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-accent/40 py-2.5 text-[11px] font-bold text-slate-400 transition hover:border-primary/50 hover:text-primary disabled:opacity-50"
        >
          {isBusy ? <LoadingSpinner size="xs" /> : <LuImagePlus size={14} />}
          {isSettingBackground ? "Uploading…" : "Upload custom"}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          hidden
          onChange={handleFileChange}
        />
        <p className="mt-1.5 text-center text-[9px] text-slate-600">JPEG · PNG · WebP · max 5 MB</p>
      </div>
    </div>
  )
}

export default PomodoroBackgroundPicker
