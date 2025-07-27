// components/common/ConfirmationModal.jsx
import React, { useRef, useEffect } from "react";
import { IoClose } from "react-icons/io5";

const DeleteScheduledPostsModal = ({
  isOpen,
  onClose,
  title,
  message,
  confirmButtonText,
  onConfirm,
  isConfirming = false, // To show loading state on confirm button
  confirmButtonColor = "bg-red-600", // Default to red for destructive actions
  confirmButtonHoverColor = "hover:bg-red-700",
}) => {
  const modalRef = useRef(null);

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
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-700 bg-opacity-70 flex justify-center items-center z-[100] p-4" // Higher z-index than ScheduledPostsModal
      onClick={handleBackgroundClick}
    >
      <div
        ref={modalRef}
        className="bg-base-100 rounded-2xl shadow-lg p-8 max-w-xs mx-auto w-full flex flex-col gap-1 "
      >
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-slate-500">{message}</p>

        <div className="flex flex-col gap-3 mt-5">
          <button
            className={`w-full ${confirmButtonColor} text-white font-semibold px-4 py-2 rounded-full ${confirmButtonHoverColor} transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? "Confirming..." : confirmButtonText}
          </button>
          <button
            className="w-full border border-gray-600 text-white font-semibold px-4 py-2 rounded-full hover:bg-secondary transition duration-200"
            onClick={onClose}
            disabled={isConfirming}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteScheduledPostsModal;
