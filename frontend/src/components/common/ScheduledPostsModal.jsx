// components/common/ScheduledPostsModal.jsx
import React, { useRef, useEffect, useState } from "react";
import { MdClose } from "react-icons/md";
import { useGetScheduledPosts } from "../../hooks/postsHooks/useGetScheduledPosts";
import LoadingSpinner from "./LoadingSpinner";
import EditScheduledPostModal from "./EditSchedulePostModal";
import { TbCalendarClock } from "react-icons/tb";
import { format } from "date-fns";
import { IoClose } from "react-icons/io5";
import { useDeleteMultipleScheduledPosts } from "../../hooks/postsHooks/useDeleteMultipleScheduledPosts";
import toast from "react-hot-toast";

const ScheduledPostsModal = ({ isOpen, onClose, onPostSelectedForEdit }) => {
  const modalRef = useRef(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPostToEdit, setSelectedPostToEdit] = useState(null);

  const { scheduledPosts, isLoading, isError, error, refetch } = useGetScheduledPosts();
  const { deleteMultipleScheduledPosts, isPending: isDeletingMultiple } =
    useDeleteMultipleScheduledPosts();

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
    if (
      window.confirm(
        `Are you sure you want to delete ${selectedPostIds.length} selected post(s)?`
      )
    ) {
      deleteMultipleScheduledPosts(selectedPostIds, {
        onSuccess: () => {
          setSelectedPostIds([]); // Clear selections after successful deletion
          setIsEditMode(false); // Exit edit mode
        },
      });
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-700 bg-opacity-70 flex justify-center z-50 p-4"
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
                  className="px-4 py-2 border-b border-accent hover:bg-secondary transition duration-200 flex items-center gap-3"
                >
                  {isEditMode && (
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary [--chkfg:white] rounded-[4px] size-5 text-white" // Use DaisyUI checkbox class if available
                        checked={selectedPostIds.includes(post._id)}
                        onChange={(e) => handleCheckboxChange(post._id, e.target.checked)}
                        // Stop propagation to prevent handleEditPostClick from firing when checkbox is clicked
                        onClick={(e) => e.stopPropagation()}
                      />
                  )}
                  {/* Wrap content in a div to make it clickable for single edit mode */}
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => handleEditPostClick(post)}
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
        <div className="flex justify-between border-t border-accent p-1">
          <button className="font-semibold px-4 py-1.5 rounded-full text-primary hover:bg-primary/10 transition duration-200">
            Select all
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
      </div>
    </div>
  );
};

export default ScheduledPostsModal;
