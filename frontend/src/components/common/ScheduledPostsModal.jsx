// components/common/ScheduledPostsModal.jsx
import React, { useRef, useEffect, useState } from "react";
import { MdClose } from "react-icons/md";
import { useGetScheduledPosts } from "../../hooks/postsHooks/useGetScheduledPosts";
import LoadingSpinner from "./LoadingSpinner";
import EditScheduledPostModal from "./EditSchedulePostModal";
import { TbCalendarClock } from "react-icons/tb";
import { format } from "date-fns";
import { IoClose } from "react-icons/io5";

const ScheduledPostsModal = ({ isOpen, onClose, onPostSelectedForEdit }) => {
  const modalRef = useRef(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPostToEdit, setSelectedPostToEdit] = useState(null);

  const { scheduledPosts, isLoading, isError, error, refetch } = useGetScheduledPosts();

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
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
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
        className="bg-base-100 rounded-2xl shadow-lg mt-7 max-w-xl mx-auto w-full flex flex-col overflow-hidden h-[80vh]" // Adjust height as needed
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-3 py-2 mb-2">
          <div className="flex gap-5 items-center">
            <button
              className="hover:bg-secondary rounded-full p-1 transition duration-200"
              onClick={onClose}
            >
              <IoClose strokeWidth={1} size={24} />
            </button>
            <h2 className="text-xl font-bold">Drafts</h2>
          </div>
          <button
            className="bg-primary text-white font-semibold px-4 py-1.5 rounded-full hover:opacity-90 transition duration-200 text-sm"
            onClick={() => console.log("Edit button clicked")} // Placeholder for future edit all functionality
          >
            Edit
          </button>
        </div>

        {/* Scheduled Posts List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center items-center h-full">
              <LoadingSpinner size="lg" /> {/* Use your spinner component */}
            </div>
          )}

          {isError && (
            <p className="text-red-500 text-center mt-4">Error: {error.message}</p>
          )}

          {!isLoading && !isError && scheduledPosts?.length === 0 && (
            <p className="text-white text-center mt-4">No scheduled posts found.</p>
          )}

          {!isLoading && !isError && scheduledPosts?.length > 0 && (
            <ul>
              {scheduledPosts.map((post) => (
                <li
                  key={post._id}
                  className="px-4 py-2 border-y border-accent hover:bg-secondary transition duration-200 cursor-pointer"
                  onClick={() => handleEditPostClick(post)}
                >
                  <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                    <TbCalendarClock size={18} />
                    Will send on{" "}
                    {format(new Date(post.scheduledAt), "EEE, MMM d, yyyy 'at' h:mm a")}
                  </p>
                  <p className="text-base">{post.text || "(No text)"}</p>
                  {post.img && (
                    <img
                      src={post.img}
                      alt="Post image"
                      className="mt-2 rounded-lg max-h-48 object-cover"
                    />
                  )}
                  {post.video && (
                    <video
                      controls
                      src={post.video}
                      className="mt-2 rounded-lg max-h-48 object-cover"
                    />
                  )}
                  {post.pollOptions && post.pollOptions.length > 0 && (
                    <div className="mt-2 text-sm text-gray-400">
                      Poll: {post.pollOptions.map((opt) => opt.text).join(", ")}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduledPostsModal;
