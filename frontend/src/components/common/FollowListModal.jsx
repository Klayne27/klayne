// components/common/FollowListModal.jsx
import { useEffect, useRef } from "react";
import UserListItem from "./UserListItem";
import LoadingSpinner from "./LoadingSpinner";
import { useFetchFollowList } from "../../hooks/usersHooks/useFetchFollowList";
import XSvg from "../svgs/X"; // Assuming you have this close icon
import { IoClose } from "react-icons/io5";

const FollowListModal = ({ userId, type, onClose, page }) => {
  const modalTitle = type === "following" ? "Following" : "Followers";
  const dialogRef = useRef(null); // Rename to dialogRef for clarity

  const { users, isLoading, error } = useFetchFollowList(userId, type);

  // useEffect to handle the native <dialog> 'close' event
  useEffect(() => {
    const dialogElement = dialogRef.current;
    if (!dialogElement) return;

    // This handler captures closing via:
    // 1. User pressing the Escape key.
    // 2. User clicking on the ::backdrop (the dimmed area around the modal content).
    const handleDialogClose = () => {
      onClose(); // Call the parent's onClose handler
    };

    // Add the event listener for the native 'close' event
    dialogElement.addEventListener("close", handleDialogClose);

    // Cleanup function
    return () => {
      dialogElement.removeEventListener("close", handleDialogClose);
    };
  }, [onClose]); // Dependency array: re-run if onClose changes

  // Optional: Add a specific onMouseDown handler for clicks directly on the dialog element itself (the backdrop)
  // This is often redundant with the 'close' event, but can be a robust fallback.
  const handleMouseDownOnDialog = (e) => {
    // If the click target is exactly the <dialog> element (i.e., the backdrop)
    // and NOT one of its children (like the inner div, or a button inside)
    if (dialogRef.current && e.target === dialogRef.current) {
      onClose();
    }
    // If the click is on a child, let it bubble up normally,
    // unless the child itself stops propagation.
  };

  return (
    <dialog
      ref={dialogRef} // Assign the ref to the dialog element
      // Using the ID for document.getElementById from parent, though ref is better for internal use
      id={`${
        page === "profilePage" ? `follow_list_modal_${type}` : `follow_modal_list_${type}`
      }`}
      className="modal modal-middle sm:modal-middle flex justify-center px-10"
      // Attach the onMouseDown handler to the dialog element
      onMouseDown={handleMouseDownOnDialog}
    >
      <div className="w-[350px] md:w-[500px] bg-base-100 rounded-2xl border border-accent relative">
        <h3 className="font-bold text-lg border-b border-accent px-4 py-2 text-center mb-5">
          {modalTitle}
        </h3>

        {isLoading && (
          <div className="flex justify-center items-center h-40">
            <LoadingSpinner size="sm" />
          </div>
        )}
        {error && <p className="text-red-500 text-center">{error.message}</p>}
        {!isLoading && users?.length === 0 && (
          <p className="text-center text-gray-500">
            {type === "following" ? "Not following anyone yet." : "No followers yet."}
          </p>
        )}
        {!isLoading && users?.length > 0 && (
          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
            {users?.map((user) => (
              <UserListItem
                key={user._id}
                user={user}
                // Pass onClose if UserListItem's actions should also close the modal.
                // Otherwise, ensure UserListItem's clickable elements stop propagation if needed.
                onModalClose={onClose} // Renamed prop to avoid confusion if UserListItem has its own onClose
              />
            ))}
          </div>
        )}
        <div className="modal-action">
          <button
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            onClick={(e) => {
              e.stopPropagation(); // VERY IMPORTANT: Prevents the button click from bubbling up
              // to the dialog's onMouseDown or document's mousedown listeners.
              onClose(); // Call the close function
            }}
          >
            <IoClose size={25} />
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default FollowListModal;
