const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
      onClick={onClose} // Close modal when clicking outside
    >
      <div
        className="bg-black p-6 rounded-3xl shadow-lg max-w-sm w-full mx-4 border border-gray-700"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
