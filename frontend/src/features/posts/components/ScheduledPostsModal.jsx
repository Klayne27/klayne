import { useRef, useState } from "react"
import { TbCalendarClock } from "react-icons/tb"
import { format } from "date-fns"
import { IoClose } from "react-icons/io5"
import useLockBodyScroll from "../../../hooks/customHooks/useLockBodyScroll"
import { useTouchHoverEffect } from "../../../hooks/customHooks/useTouchHoverEffect"
import { showAppToast } from "../../../utils/showAppToast"
import LoadingSpinner from "../../../components/common/LoadingSpinner"
import ConfirmationModal from "../../../components/common/ConfirmationModal"
import { useGetScheduledPosts } from "../postsHooks/usePostsQueries"
import { useDeleteMultipleScheduledPosts } from "../postsHooks/usePostsMutations"
import { shouldTextBeWhite } from "../../../utils/shouldTextBeWhite"
import { useTheme } from "../../../context/ThemeContext"

const ScheduledPostsModal = ({ isOpen, onClose, onPostSelectedForEdit }) => {
  const modalRef = useRef(null)

  const { theme } = useTheme()

  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedPostIds, setSelectedPostIds] = useState([])
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)

  useLockBodyScroll(isOpen)

  const { scheduledPosts, isLoading, isError, error } = useGetScheduledPosts()
  const { deleteMultipleScheduledPosts, isPending: isDeletingMultiple } =
    useDeleteMultipleScheduledPosts()

  const { isTouchDevice, activeButtonId, handleTouchCancel, handleTouchEnd, handleTouchStart } =
    useTouchHoverEffect()

  const handleCheckboxChange = (postId, isChecked) => {
    setSelectedPostIds((prevSelected) =>
      isChecked ? [...prevSelected, postId] : prevSelected.filter((id) => id !== postId),
    )
  }

  const handleDeleteSelected = () => {
    if (selectedPostIds.length === 0) {
      showAppToast("Please select at least one post to delete.", "error")
      return
    }
    setShowDeleteConfirmModal(true)
  }

  const areAllPostsSelected =
    (scheduledPosts && selectedPostIds.length === scheduledPosts.length) ||
    selectedPostIds.length > 0

  const handleSelectAllToggle = () => {
    if (areAllPostsSelected) {
      setSelectedPostIds([])
    } else {
      setSelectedPostIds(scheduledPosts ? scheduledPosts.map((post) => post._id) : [])
    }
  }

  const handleToggleEditMode = () => {
    setIsEditMode((prev) => !prev)
    setSelectedPostIds([])
  }

  const handleBackgroundClick = (e) => {
    e.stopPropagation()
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose()
      setIsEditMode(false)
    }
  }

  const handleEditPostClick = (post) => {
    onPostSelectedForEdit(post)
  }

  const handlePostListItemClick = (post) => {
    if (isEditMode) {
      const isCurrentlySelected = selectedPostIds.includes(post._id)
      handleCheckboxChange(post._id, !isCurrentlySelected)
    } else {
      handleEditPostClick(post)
    }
  }

  const handleConfirmDelete = () => {
    deleteMultipleScheduledPosts(selectedPostIds)
    setShowDeleteConfirmModal(false)
    setIsEditMode(false)
  }

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-gray-700 bg-opacity-70 p-4 ${
        isOpen ? "modal-open" : ""
      }`}
      onClick={handleBackgroundClick}
    >
      <div
        ref={modalRef}
        className="mx-auto mt-7 flex h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-base-100 shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-slate-500 px-3 py-2">
          <div className="flex items-center gap-5">
            <button
              className="rounded-full p-1 transition duration-200 hover:bg-secondary"
              onClick={() => {
                onClose()
                setIsEditMode(false)
              }}
            >
              <IoClose strokeWidth={1} size={24} />
            </button>
            <h2 className="text-xl font-bold">Scheduled Posts</h2>{" "}
          </div>
          {isEditMode ? (
            <div className="flex items-center gap-2">
              <button
                className={`bg-slate-500 ${shouldTextBeWhite(theme)} rounded-full px-4 py-1.5 text-sm font-semibold transition duration-200 hover:bg-slate-600`}
                onClick={handleToggleEditMode}
              >
                Done
              </button>
            </div>
          ) : (
            <button
              className={`bg-primary ${shouldTextBeWhite(theme)} rounded-full px-4 py-1.5 text-sm font-semibold transition duration-200 hover:opacity-90`}
              onClick={handleToggleEditMode}
            >
              Edit
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex h-full items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {isError && (
            <p className="mt-4 text-center text-red-500">
              Error: {error?.message || "Failed to load scheduled posts."}
            </p>
          )}

          {!isLoading && !isError && scheduledPosts?.length === 0 && (
            <p className="mt-4 text-center text-slate-500">No scheduled posts found.</p>
          )}

          {!isLoading && !isError && scheduledPosts?.length > 0 && (
            <ul>
              {scheduledPosts.map((post) => (
                <li
                  key={post._id}
                  className={`flex items-center gap-3 border-b border-slate-500 px-4 py-2 transition duration-200 ${
                    !isTouchDevice ? "hover:bg-secondary" : ""
                  } ${
                    isTouchDevice && activeButtonId === "scheduled-post"
                      ? "bg-secondary transition duration-150"
                      : ""
                  }`}
                  onClick={() => handlePostListItemClick(post)}
                  onTouchStart={() => handleTouchStart("scheduled-post")}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                >
                  {isEditMode && (
                    <input
                      type="checkbox"
                      className="checkbox-primary checkbox size-5 rounded-[4px] border-2 border-slate-500 text-white [--chkfg:white]" // Use DaisyUI checkbox class if available
                      checked={selectedPostIds.includes(post._id)}
                      onChange={(e) => handleCheckboxChange(post._id, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <div
                    className={`flex-1 cursor-pointer ${
                      isEditMode ? "cursor-default" : "cursor-pointer"
                    }`}
                  >
                    <p className="mb-1 flex items-center gap-2 text-sm text-slate-500">
                      <TbCalendarClock size={18} />
                      Will send on{" "}
                      {format(new Date(post.scheduledAt), "EEE, MMM d, yyyy 'at' h:mm a")}
                    </p>
                    <p className="text-base">{post.text || "(No text)"}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {isEditMode && (
          <div className="flex justify-between border-t border-slate-500 p-1">
            <button
              className="rounded-full px-4 py-1.5 font-semibold text-primary transition duration-200 hover:bg-primary/10"
              onClick={handleSelectAllToggle}
              disabled={isLoading || isError || scheduledPosts?.length === 0}
            >
              {areAllPostsSelected ? "Deselect All" : "Select All"}
            </button>

            <button
              className={`rounded-full px-4 py-1.5 ${
                selectedPostIds.length === 0 ? "" : "hover:bg-red-700/10"
              } font-semibold text-red-600 transition duration-200 disabled:opacity-50`}
              onClick={handleDeleteSelected}
              disabled={selectedPostIds.length === 0 || isDeletingMultiple}
            >
              {isDeletingMultiple ? "Deleting..." : `Delete`}
            </button>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        onConfirm={handleConfirmDelete}
        modalTitle="Delete Scheduled Posts?"
        message={`This can't be undone and you'll lose ${selectedPostIds.length} scheduled post(s).`}
        confirmButtonText={isDeletingMultiple ? "Deleting..." : "Delete"}
        danger={true}
      />
    </div>
  )
}

export default ScheduledPostsModal
