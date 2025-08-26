// components/common/SchedulePostModal.jsx
import { useEffect, useRef } from "react"
import { IoClose } from "react-icons/io5"
import { showAppToast } from "../../../utils/showAppToast"
import DateTimeSelector from "../../../components/common/DateTimeSelector" // Make sure this path is correct
import useDateTimeStore from "../../../store/useDateTimeStore"

const SchedulePostModal = ({
  isOpen,
  onClose,
  onScheduleConfirm,
  initialDate,
  openAllScheduledPosts,
  scheduledAt,
  onRemoveSchedule,
}) => {
  const modalRef = useRef(null)
  const { isOverallPast, getScheduledDateTime, initializeDateTime } =
    useDateTimeStore() 

  useEffect(() => {
    if (isOpen) {
      initializeDateTime(initialDate)
    }
  }, [isOpen, initialDate, initializeDateTime]) // Effect for body scroll lock (if useLockBodyScroll is not used)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleConfirm = () => {
    // You might want to do a final validation check here as well, just in case
    if (!isOverallPast) {
      onScheduleConfirm(getScheduledDateTime().toISOString())
      onClose() // Close modal on successful confirm
    } else {
      showAppToast("Cannot schedule a post in the past.", "error")
    }
  }

  const handleResetSchedule = () => {
    initializeDateTime(null) // Reset to default (10 mins from now)
    onRemoveSchedule()
  }

  const handleBackgroundClick = (e) => {
    e.stopPropagation()
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose()
    }
  }
  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-gray-700 bg-opacity-70 p-4 ${
        isOpen ? "modal-open" : ""
      }`}
      onClick={handleBackgroundClick}
    >
      <div
        ref={modalRef}
        className="mx-auto mt-7 flex max-h-fit w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-base-100 shadow-lg"
      >
        <div className="flex items-center justify-between p-2 px-3">
          <div className="flex items-center gap-5">
            <button
              className="rounded-full p-1 transition duration-200 hover:bg-secondary"
              onClick={onClose}
            >
              <IoClose strokeWidth={1} size={24} />
            </button>
            <h2 className="text-xl font-bold">Schedule</h2>
          </div>

          <div className="flex gap-3">
            {scheduledAt && (
              <button
                onClick={handleResetSchedule} // Just call handleResetSchedule
                className="rounded-full px-3 font-semibold transition duration-200 hover:bg-secondary"
              >
                Clear
              </button>
            )}

            <button
              className={`rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-white transition duration-200 ${
                isOverallPast ? "cursor-not-allowed opacity-50" : "hover:opacity-80"
              }`}
              onClick={handleConfirm}
              disabled={isOverallPast} // Disable button if overall time is in the past
            >
              Confirm
            </button>
          </div>
        </div>

        <DateTimeSelector />

        <div className="flex border-t border-slate-500 p-4">
          <p
            className="flex cursor-pointer items-center rounded-full p-1 px-4 text-sm font-semibold text-primary transition duration-200 hover:bg-primary/15"
            onClick={() => {
              openAllScheduledPosts()
            }}
          >
            Scheduled posts
          </p>
        </div>
      </div>
    </div>
  )
}

export default SchedulePostModal
