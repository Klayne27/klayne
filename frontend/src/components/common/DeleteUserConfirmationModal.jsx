
const DeleteUserConfirmationModal = ({ isOpen, onClose, onConfirm, username }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[1000]">
      <div className="bg-base-200 p-6 rounded-lg shadow-xl border border-accent w-80 max-w-[90%] flex flex-col gap-4 text-center">
        <h3 className="font-bold text-lg text-error">Delete User Account?</h3>
        <p className="text-sm text-base-content">
          Are you absolutely sure you want to delete the account of{" "}
          <span className="font-bold text-error">@{username}</span>?
          <br />
          <span className="text-warning text-sm font-semibold">
            This action is irreversible and will permanently delete all of their posts,
            comments, likes, messages, and followers.
          </span>
        </p>
        <div className="modal-action flex justify-center gap-4 mt-2">
          <button
            className="btn btn-sm btn-error text-white px-6 py-2 rounded-full font-bold transition duration-200 hover:scale-105"
            onClick={onConfirm}
          >
            Delete Permanently
          </button>
          <button
            className="btn btn-sm btn-ghost px-6 py-2 rounded-full font-bold transition duration-200 hover:bg-neutral hover:text-white"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteUserConfirmationModal;
