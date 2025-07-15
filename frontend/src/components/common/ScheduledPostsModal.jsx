// components/common/ScheduledPostsModal.jsx
import React, { useRef, useEffect, useState, useCallback } from "react";
import { MdClose } from "react-icons/md";
import { useGetScheduledPosts } from "../../hooks/postsHooks/useGetScheduledPosts";
import LoadingSpinner from "./LoadingSpinner";
import EditScheduledPostModal from "./EditSchedulePostModal";
import { TbCalendarClock } from "react-icons/tb";
import { format } from "date-fns";
import { IoClose } from "react-icons/io5";
import { useDeleteMultipleScheduledPosts } from "../../hooks/postsHooks/useDeleteMultipleScheduledPosts";
import toast from "react-hot-toast";
import DeleteScheduledPostsModal from "./DeleteScheduledPostsModal";
import useLockBodyScroll from "../../hooks/useLockBodyScroll";

const ScheduledPostsModal = ({ isOpen, onClose, onPostSelectedForEdit }) => {
  const modalRef = useRef(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPostToEdit, setSelectedPostToEdit] = useState(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  useLockBodyScroll(isOpen)

  // --- NEW STATE FOR TOUCH EFFECT ---
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [activeButton, setActiveButton] = useState(null); // Tracks which button is "active" on touch

  const { scheduledPosts, isLoading, isError, error, refetch } = useGetScheduledPosts();
  const { deleteMultipleScheduledPosts, isPending: isDeletingMultiple } =
    useDeleteMultipleScheduledPosts();

  // --- NEW TOUCH HANDLERS ---
  const handleTouchStart = useCallback(
    (id) => {
      if (isTouchDevice) {
        setActiveButton(id);
      }
    },
    [isTouchDevice]
  );

  const handleTouchEnd = useCallback(() => {
    if (isTouchDevice) {
      setTimeout(() => {
        setActiveButton(null);
      }, 200); // Match your desired fade-out duration (e.g., 150ms for a quick fade)
    }
  }, [isTouchDevice]);

  const handleTouchCancel = useCallback(() => {
    if (isTouchDevice) {
      setTimeout(() => {
        setActiveButton(null);
      }, 200);
    }
  }, [isTouchDevice]);

  const handleCheckboxChange = (postId, isChecked) => {
    setSelectedPostIds((prevSelected) =>
      isChecked ? [...prevSelected, postId] : prevSelected.filter((id) => id !== postId)
    );
  };

  const handleDeleteSelected = () => {
    if (selectedPostIds.length === 0) {
      toast.error("Please select at least one post to delete.");
      return;
    }
    setShowDeleteConfirmModal(true); // Open the confirmation modal
  };

  const areAllPostsSelected =
    (scheduledPosts && selectedPostIds.length === scheduledPosts.length) ||
    selectedPostIds.length > 0;

  // New function to handle select/deselect all
  const handleSelectAllToggle = () => {
    if (areAllPostsSelected) {
      // If all are selected, deselect all
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleBackgroundClick = (e) => {
    e.stopPropagation();
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
      setIsEditMode(false); // Ensure edit mode is off on close
      setSelectedPostIds([]); // Clear selected posts on close
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
    deleteMultipleScheduledPosts(selectedPostIds, {
      onSuccess: () => {
        setSelectedPostIds([]); // Clear selections after successful deletion
        setIsEditMode(false); // Exit edit mode
        setShowDeleteConfirmModal(false); // Close the confirmation modal
        // `refetch` or `invalidateQueries` in the hook will update the list
      },
      onError: () => {
        // Handle error if deletion fails
        setShowDeleteConfirmModal(false); // Close the confirmation modal even on error
      },
    });
  };


  // --- EFFECT TO DETECT TOUCH DEVICE ---
  useEffect(() => {
    setIsTouchDevice(
      "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
    );
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-gray-700 bg-opacity-70 flex justify-center z-50 p-4 ${isOpen ? "modal-open" : ""}`}
      onClick={handleBackgroundClick}
    >
      <div
        ref={modalRef}
        className="bg-base-100 rounded-2xl shadow-lg mt-7 max-w-xl mx-auto w-full flex flex-col overflow-hidden h-[80vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-accent">
          <div className="flex gap-5 items-center">
            <button
              className="hover:bg-secondary rounded-full p-1 transition duration-200"
              onClick={onClose}
            >
              <IoClose strokeWidth={1} size={24} />
            </button>
            <h2 className="text-xl font-bold">Scheduled Posts</h2>{" "}
            {/* Changed from Drafts to Scheduled Posts */}
          </div>
          {isEditMode ? (
            <div className="flex items-center gap-2">
              <button
                className="bg-gray-500 text-white font-semibold px-4 py-1.5 rounded-full hover:bg-gray-600 transition duration-200 text-sm"
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
            <p className="text-center text-gray-500 mt-4">No scheduled posts found.</p>
          )}

          {!isLoading && !isError && scheduledPosts?.length > 0 && (
            <ul>
              {scheduledPosts.map((post) => (
                <li
                  key={post._id}
                  className={`px-4 py-2 border-b border-accent  transition duration-200 flex items-center gap-3 ${
                    !isTouchDevice ? "hover:bg-secondary" : ""
                  }  ${
                    isTouchDevice && activeButton === "scheduled-post"
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
                      className="checkbox checkbox-primary border-gray-500 [--chkfg:white] rounded-[4px] size-5 text-white border-2" // Use DaisyUI checkbox class if available
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
                    <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
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
          <div className="flex justify-between border-t border-accent p-1">
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
      <DeleteScheduledPostsModal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        title="Delete Scheduled Posts?"
        message={`This can't be undone and you'll lose ${selectedPostIds.length} scheduled post(s).`}
        confirmButtonText={isDeletingMultiple ? "Deleting..." : "Delete"}
        onConfirm={handleConfirmDelete}
        isConfirming={isDeletingMultiple}
        confirmButtonColor="bg-red-600"
        confirmButtonHoverColor="hover:bg-red-700"
      />
    </div>
  );
};

export default ScheduledPostsModal;
