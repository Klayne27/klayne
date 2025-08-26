// components/common/FollowListModal.jsx
import { useEffect, useRef } from "react";
import UserListItem from "./UserListItem";
import LoadingSpinner from "./LoadingSpinner";
import { useGetFollowList } from "../../hooks/usersHooks/useGetFollowList";
import { IoClose } from "react-icons/io5";

const FollowListModal = ({ userId, type, onClose, page }) => {
  const modalTitle = type === "following" ? "Following" : "Followers";
  const dialogRef = useRef(null); // Rename to dialogRef for clarity

  const { users, isLoading, error } = useGetFollowList(userId, type);

  useEffect(() => {
    const dialogElement = dialogRef.current;
    if (!dialogElement) return;

    const handleDialogClose = () => {
      onClose(); // Call the parent's onClose handler
    };

    dialogElement.addEventListener("close", handleDialogClose);

    return () => {
      dialogElement.removeEventListener("close", handleDialogClose);
    };
  }, [onClose]); // Dependency array: re-run if onClose changes

  const handleMouseDownOnDialog = (e) => {
    if (dialogRef.current && e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef} // Assign the ref to the dialog element
      id={`${
        page === "profilePage" ? `follow_list_modal_${type}` : `follow_modal_list_${type}`
      }`}
      className="modal modal-middle sm:modal-middle flex justify-center px-10"
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
          <p className="text-center text-slate-500">
            {type === "following" ? "Not following anyone yet." : "No followers yet."}
          </p>
        )}
        {!isLoading && users?.length > 0 && (
          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
            {users?.map((user) => (
              <UserListItem
                key={user._id}
                user={user}
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
