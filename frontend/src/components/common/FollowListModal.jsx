import { useQuery } from "@tanstack/react-query";
import UserListItem from "./UserListItem"; // Import the UserListItem component
import LoadingSpinner from "./LoadingSpinner"; // Import LoadingSpinner

const FollowListModal = ({ userId, type, onClose }) => {
  // Added onClose prop
  const queryKey =
    type === "following" ? ["followingList", userId] : ["followersList", userId];
  const endpoint =
    type === "following"
      ? `/api/users/following/${userId}`
      : `/api/users/followers/${userId}`;
  const modalTitle = type === "following" ? "Following" : "Followers";

  const {
    data: users,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      const res = await fetch(endpoint);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to fetch ${type} list`);
      return data;
    },
    enabled: !!userId, // Only run the query if userId is available
  });

  return (
    <dialog
      id={`follow_list_modal_${type}`}
      className="modal modal-bottom sm:modal-middle"
      onMouseDown={(e) => {
        // Close modal when clicking outside of modal-box
        if (e.target.id === `follow_list_modal_${type}`) {
          onClose();
        }
      }}
    >
      <div className="modal-box rounded-lg border border-gray-700">
        <h3 className="font-bold text-lg mb-4">{modalTitle}</h3>
        {isLoading && (
          <div className="flex justify-center items-center h-48">
            <LoadingSpinner size="lg" />
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
          <form method="dialog">
            {/* if there is a button in form, it will close the modal */}
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={onClose}
            >
              ✕
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
};

export default FollowListModal;
