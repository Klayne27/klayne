import { useRef } from "react"
import { createPortal } from "react-dom" // 1. Import createPortal
import useLockBodyScroll from "../../hooks/customHooks/useLockBodyScroll"

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  danger,
  message,
  confirmButtonText,
  modalTitle,
  children,
  isConfirmDisabled = false,
  isLoading = false,
}) => {
  const modalRef = useRef(null)

  useLockBodyScroll(isOpen)

  if (!isOpen) return null

  // 2. Wrap your JSX in createPortal
  // Usually, 'document.body' is fine, or you can use document.getElementById('portal-root')
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex cursor-default items-center justify-center bg-gray-700 bg-opacity-70 p-4"
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div
        ref={modalRef}
        className="mx-auto flex w-full max-w-xs flex-col gap-4 rounded-2xl bg-base-100 p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside
        tabIndex="-1"
      >
        <h2 id="modal-title" className="break-words text-xl font-bold">
          {modalTitle}
        </h2>
        <p id="modal-description" className="text-sm text-gray-400">
          {message}
        </p>

        {children}

        <div className="mt-4 flex flex-col gap-3">
          <button
            className={`w-full rounded-full py-2.5 font-bold transition duration-200 ${
              danger
                ? "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50"
                : "bg-white text-black hover:bg-gray-200 disabled:bg-slate-500 disabled:text-slate-600"
            } ${isLoading ? "cursor-not-allowed opacity-70" : ""} `}
            onClick={onConfirm}
            disabled={isConfirmDisabled || isLoading}
          >
            {isLoading ? "Loading..." : confirmButtonText}
          </button>
          <button
            className="w-full rounded-full border border-accent py-2.5 font-bold transition duration-200 hover:bg-gray-900 hover:text-white disabled:opacity-50"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body, // 3. Target container
  )
}

export default ConfirmationModal
