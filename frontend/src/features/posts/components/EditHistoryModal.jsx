import { IoClose } from "react-icons/io5"
import { format } from "date-fns" // A great library for date formatting
import { formatDate, formatTime } from "../../../utils/date"

const EditHistoryModal = ({ isOpen, onClose, history }) => {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-700/70 p-4"
      onClick={onClose}
    >
      <div
        className="custom-scrollbar mx-auto flex max-h-[90vh] w-full max-w-xl flex-col overflow-y-auto rounded-2xl bg-base-100  shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 ">
          <h2 className="text-xl font-bold">Edit History</h2>
          <button onClick={onClose}>
            <IoClose size={24} />
          </button>
        </div>
        <div className="">
          {history && history.length > 0 ? (
            history.map((edit, index) => (
              <div key={index} className="border-t border-accent p-4 px-5">
                <p className="text-xs text-slate-500">
                  Edited on: {formatDate(edit.editedAt)} at {formatTime(edit.editedAt)}
                </p>
                <p className="mt-2 text-base">{edit.text}</p>
              </div>
            ))
          ) : (
            <p className="text-slate-500">No edit history available for this post.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default EditHistoryModal
