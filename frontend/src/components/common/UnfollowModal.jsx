import React, { useEffect } from "react";

const UnfollowModal = ({ isOpen, onClose, onUnfollowConfirm, username }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"; // Disable scrolling
    } else {
      document.body.style.overflow = "unset"; // Re-enable scrolling
    }

    // Cleanup function to re-enable scrolling when component unmounts or modal closes
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackgroundClick = (e) => {
    // Only close if the click is directly on the overlay, not on the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-700 bg-opacity-70 flex items-center justify-center z-50"
      onClick={handleBackgroundClick} // Add click handler to the overlay
    >
      <div className="bg-base-100 rounded-2xl px-8 py-7 shadow-lg max-w-[330px] mx-4 w-full">
        <div className="text-xl font-bold mb-2 ">
          <h2>Unfollow</h2>
          <p> @{username}?</p>
        </div>
        <p className="text-gray-500 mb-6">
          Their posts will no longer show up in your For You timeline. You can still view
          their profile, unless their posts are protected.
        </p>
        <div className="flex flex-col gap-3">
          <button
            className="w-full bg-primary hover:bg-primary/80 text-white font-semibold py-3 rounded-full transition duration-200"
            onClick={onUnfollowConfirm}
          >
            Unfollow
          </button>
          <button
            className="w-full bg-base-100 hover:bg-secondary  font-semibold py-3 rounded-full transition duration-200 border border-gray-600"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnfollowModal;
