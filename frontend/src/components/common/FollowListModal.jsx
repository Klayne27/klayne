import UserListItem from "./UserListItem";
import LoadingSpinner from "./LoadingSpinner";
import { useFetchUsers } from "../../hooks/usersHooks/useFetchUsers";

const FollowListModal = ({ userId, type, onClose }) => {
  const queryKey =
    type === "following" ? ["followingList", userId] : ["followersList", userId];
  const endpoint =
    type === "following"
      ? `/api/users/following/${userId}`
      : `/api/users/followers/${userId}`;
  const modalTitle = type === "following" ? "Following" : "Followers";

  const { users, isLoading, error } = useFetchUsers(userId, queryKey, endpoint, type);

  return (
    <dialog
      id={`follow_list_modal_${type}`}
      className="modal modal-middle sm:modal-middle flex justify-center px-10"
      onMouseDown={(e) => {
        // Stop propagation if the click is on the dialog itself (outside the content)
        if (e.target.id === `follow_list_modal_${type}`) {
          e.stopPropagation();
          onClose();
        }
      }}
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
            {users.map((user) => (
              <UserListItem key={user._id} user={user} />
            ))}
          </div>
        )}
        <div className="modal-action">
          {/* Move the button outside the form or handle its click directly */}
          <button
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            // Add stopPropagation directly to the button's onClick
            onClick={(e) => {
              e.stopPropagation(); // Prevent the click from bubbling up
              onClose(); // Call your close function
            }}
          >
            
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default FollowListModal;
