import { useRef } from "react"
import useLockBodyScroll from "../../hooks/customHooks/useLockBodyScroll"

const MuteOptionsModal = ({
  isOpen,
  onClose,
  onMute, // Function that accepts { muteType: 'standard' | 'total' }
  username,
  isLoading = false,
}) => {
  const modalRef = useRef(null)

  // Lock scroll when open
  useLockBodyScroll(isOpen)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex cursor-default items-center justify-center bg-gray-700 bg-opacity-70 p-4"
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className="mx-auto flex w-full max-w-xs flex-col gap-4 rounded-2xl bg-base-100 p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-1">
          <h2 className="break-words text-xl font-bold">Mute @{username}</h2>
          <p className="text-sm text-gray-400">Muting will hide their posts from your timeline.</p>
        </div>

        <div className="mt-2 flex flex-col gap-3">
          {/* STANDARD MUTE BUTTON */}
          <button
            className="group w-full rounded-xl border border-accent p-3 text-left transition duration-200 hover:bg-secondary"
            onClick={() => onMute({ muteType: "standard" })}
            disabled={isLoading}
          >
            <p className="text-sm font-bold">Standard Mute</p>
            <p className="text-xs text-gray-500 group-hover:text-gray-400">
              Hide posts, receive messages, and mentions still notify you.
            </p>
          </button>

          {/* TOTAL MUTE BUTTON */}
          <button
            className="group w-full rounded-xl border border-accent p-3 text-left transition duration-200 hover:bg-secondary"
            onClick={() => onMute({ muteType: "total" })}
            disabled={isLoading}
          >
            <p className="text-sm font-bold text-yellow-500">Total Mute</p>
            <p className="text-xs text-gray-500 group-hover:text-gray-400">
              Hide posts, block messages and notifications.
            </p>
          </button>

          {/* CANCEL BUTTON */}
          <button
            className="mt-2 w-full rounded-full border border-accent py-2.5 font-bold transition duration-200 hover:bg-gray-900 hover:text-white"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default MuteOptionsModal
