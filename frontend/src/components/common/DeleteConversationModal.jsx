import React from "react";

// This is the component that would be used in your frontend application.
// Pass props for the title, message, button texts, and click handlers.

const DeleteConversationModal = ({
  title,
  message,
  confirmButtonText,
  cancelButtonText,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      {/* Modal content container */}
      <div
        className="
          bg-base-100 
          rounded-2xl
          shadow-xl
          p-6 sm:p-8 
          w-full max-w-sm
          mx-auto 
        "
      >
        {/* Modal Title */}
        <h3 className="text-white text-2xl font-bold text-center mb-4">{title}</h3>

        {/* Modal Message */}
        <p className="text-gray-200 text-base text-center mb-8 leading-relaxed">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-4">
          <button
            onClick={onConfirm}
            className="
              bg-red-500 hover:bg-red-600
              text-white
              font-semibold
              py-3
              rounded-lg
              w-full
              transition duration-200 ease-in-out
              focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50
            "
          >
            {confirmButtonText}
          </button>

          <button
            onClick={onCancel}
            className="
              bg-gray-700 hover:bg-gray-600
              text-white
              font-semibold
              py-3
              rounded-lg
              w-full
              transition duration-200 ease-in-out
              focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50
            "
          >
            {cancelButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConversationModal;
