const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-700 bg-opacity-70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-base-100 p-6 rounded-3xl shadow-lg max-w-sm w-full mx-4 border border-accent"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;
