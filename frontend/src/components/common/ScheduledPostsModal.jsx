import { useRef, useState } from "react";
import { useGetScheduledPosts } from "../../hooks/postsHooks/useGetScheduledPosts";
import LoadingSpinner from "../ui/LoadingSpinner";
import { TbCalendarClock } from "react-icons/tb";
import { format } from "date-fns";
import { IoClose } from "react-icons/io5";
import { useDeleteMultipleScheduledPosts } from "../../hooks/postsHooks/useDeleteMultipleScheduledPosts";
import useLockBodyScroll from "../../hooks/customHooks/useLockBodyScroll";
import { showAppToast } from "../../utils/showAppToast";
import ConfirmationModal from "../ui/ConfirmationModal";
import { useTouchHoverEffect } from "../../hooks/customHooks/useTouchHoverEffect";

const ScheduledPostsModal = ({ isOpen, onClose, onPostSelectedForEdit }) => {
  const modalRef = useRef(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState([]);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  useLockBodyScroll(isOpen);

  const { scheduledPosts, isLoading, isError, error } = useGetScheduledPosts();
  const { deleteMultipleScheduledPosts, isPending: isDeletingMultiple } =
    useDeleteMultipleScheduledPosts();

  const {
    isTouchDevice,
    activeButtonId,
    handleTouchCancel,
    handleTouchEnd,
    handleTouchStart,
  } = useTouchHoverEffect();

  const handleCheckboxChange = (postId, isChecked) => {
    setSelectedPostIds((prevSelected) =>
      isChecked ? [...prevSelected, postId] : prevSelected.filter((id) => id !== postId)
    );
  };

  const handleDeleteSelected = () => {
    if (selectedPostIds.length === 0) {
      showAppToast("Please select at least one post to delete.", "error");
      return;
    }
    setShowDeleteConfirmModal(true);
  };

  const areAllPostsSelected =
    (scheduledPosts && selectedPostIds.length === scheduledPosts.length) ||
    selectedPostIds.length > 0;

  const handleSelectAllToggle = () => {
    if (areAllPostsSelected) {
      setSelectedPostIds([]);
    } else {
      // If not all are selected, select all
      // Ensure scheduledPosts is not null/undefined before mapping
      setSelectedPostIds(scheduledPosts ? scheduledPosts.map((post) => post._id) : []);
    }
  };

  const handleToggleEditMode = () => {
    setIsEditMode((prev) => !prev);
    setSelectedPostIds([]); // Clear selections when toggling edit mode
  };


  const handleBackgroundClick = (e) => {
    e.stopPropagation();
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
      setIsEditMode(false);
    }
  };

  const handleEditPostClick = (post) => {
    onPostSelectedForEdit(post);
  };

  const handlePostListItemClick = (post) => {
    if (isEditMode) {
      // In edit mode, clicking the list item toggles its checkbox
      const isCurrentlySelected = selectedPostIds.includes(post._id);
      handleCheckboxChange(post._id, !isCurrentlySelected);
    } else {
      // Not in edit mode, open the single post edit modal
      handleEditPostClick(post);
    }
  };

  // This function will be called when the user confirms deletion from the ConfirmationModal
  const handleConfirmDelete = () => {
    deleteMultipleScheduledPosts(selectedPostIds);
    setShowDeleteConfirmModal(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-gray-700 bg-opacity-70 flex justify-center z-50 p-4 ${
        isOpen ? "modal-open" : ""
      }`}
      onClick={handleBackgroundClick}
    >
      <div
        ref={modalRef}
        className="bg-base-100 rounded-2xl shadow-lg mt-7 max-w-xl mx-auto w-full flex flex-col overflow-hidden h-[80vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-500">
          <div className="flex gap-5 items-center">
            <button
              className="hover:bg-secondary rounded-full p-1 transition duration-200"
              onClick={() => {
                onClose();
                setIsEditMode(false);
              }}
            >
              <IoClose strokeWidth={1} size={24} />
            </button>
            <h2 className="text-xl font-bold">Scheduled Posts</h2>{" "}
            {/* Changed from Drafts to Scheduled Posts */}
          </div>
          {isEditMode ? (
            <div className="flex items-center gap-2">
              <button
                className="bg-slate-500 text-white font-semibold px-4 py-1.5 rounded-full hover:bg-slate-600 transition duration-200 text-sm"
                onClick={handleToggleEditMode}
              >
                Done
              </button>
            </div>
          ) : (
            <button
              className="bg-primary text-white font-semibold px-4 py-1.5 rounded-full hover:opacity-90 transition duration-200 text-sm"
              onClick={handleToggleEditMode}
            >
              Edit
            </button>
          )}
        </div>

        {/* Scheduled Posts List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center items-center h-full">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {isError && (
            <p className="text-red-500 text-center mt-4">
              Error: {error?.message || "Failed to load scheduled posts."}
            </p>
          )}

          {!isLoading && !isError && scheduledPosts?.length === 0 && (
            <p className="text-center text-slate-500 mt-4">No scheduled posts found.</p>
          )}

          {!isLoading && !isError && scheduledPosts?.length > 0 && (
            <ul>
              {scheduledPosts.map((post) => (
                <li
                  key={post._id}
                  className={`px-4 py-2 border-b border-slate-500  transition duration-200 flex items-center gap-3 ${
                    !isTouchDevice ? "hover:bg-secondary" : ""
                  }  ${
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
                      className="checkbox checkbox-primary border-slate-500 [--chkfg:white] rounded-[4px] size-5 text-white border-2" // Use DaisyUI checkbox class if available
                      checked={selectedPostIds.includes(post._id)}
                      onChange={(e) => handleCheckboxChange(post._id, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  {/* Wrap content in a div to make it clickable for single edit mode */}
                  <div
                    className={`flex-1 cursor-pointer ${
                      isEditMode ? "cursor-default" : "cursor-pointer"
                    }`}
                    // onClick={() => handleEditPostClick(post)}
                  >
                    <p className="text-sm text-slate-500 mb-1 flex items-center gap-2">
                      <TbCalendarClock size={18} />
                      Will send on{" "}
                      {format(new Date(post.scheduledAt), "EEE, MMM d, yyyy 'at' h:mm a")}
                    </p>
                    <p className="text-base">{post.text || "(No text)"}</p>
                    {/* Removed image, video, poll rendering as per text-only clarification */}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {isEditMode && (
          <div className="flex justify-between border-t border-slate-500 p-1">
            <button
              className="font-semibold px-4 py-1.5 rounded-full text-primary hover:bg-primary/10 transition duration-200"
              onClick={handleSelectAllToggle} // Attach the new handler
              disabled={isLoading || isError || scheduledPosts?.length === 0} // Disable if no posts
            >
              {areAllPostsSelected ? "Deselect All" : "Select All"}
            </button>

            <button
              className={`px-4 py-1.5 rounded-full ${
                selectedPostIds.length === 0 ? "" : "hover:bg-red-700/10"
              } text-red-600 font-semibold transition duration-200 disabled:opacity-50`}
              onClick={handleDeleteSelected}
              disabled={selectedPostIds.length === 0 || isDeletingMultiple}
            >
              {isDeletingMultiple ? "Deleting..." : `Delete`}
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Delete Selected Posts */}
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
  );
};

export default ScheduledPostsModal;
