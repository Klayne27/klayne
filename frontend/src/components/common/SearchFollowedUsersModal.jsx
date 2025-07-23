import { useState } from "react";
import { useGetFollowedUsersForMessaging } from "../../hooks/messagesHooks/useGetFollowedUsersForMessaging";
import { createPortal } from "react-dom"; // For the modal
import { CiSearch } from "react-icons/ci";

const SearchFollowedUsersModal = ({ onClose, onSelectUser, currentUserId }) => {
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const {
    data: followedUsers,
    isLoading,
    isError,
    error,
    isFetching,
  } = useGetFollowedUsersForMessaging();

  const filteredFollowedUsers = followedUsers?.filter((user) => {
    return (
      user.fullName.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(modalSearchTerm.toLowerCase())
    );
  });

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100]"
      onClick={onClose} // Close modal when clicking outside
    >
      <div
        className="bg-base-100 rounded-lg shadow-xl p-4 w-11/12 max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">New Message</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Search Input within Modal */}
        <div className="relative flex items-center mb-4">
          <CiSearch className="absolute w-4 h-4 text-gray-500 mx-3" />
          <input
            type="text"
            placeholder="Search followed users"
            className="text-sm w-full p-2 px-3 rounded-full bg-black/0 border-accent border focus:border-accent/99 focus:outline-none pl-8"
            value={modalSearchTerm}
            onChange={(e) => setModalSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-on-hover">
          {isLoading || isFetching ? (
            <p className="p-4 text-gray-400 text-center">Loading followed users...</p>
          ) : isError ? (
            <p className="p-4 text-red-500 text-center">Error: {error.message}</p>
          ) : filteredFollowedUsers && filteredFollowedUsers.length > 0 ? (
            <>
              {filteredFollowedUsers.map(
                (user) =>
                  // Exclude the current user from the list if they somehow appear (shouldn't if backend is correct)
                  user._id !== currentUserId.toString() && (
                    <div
                      key={user._id}
                      className="flex items-center gap-3 py-2 hover:bg-secondary px-2 transition-colors cursor-pointer"
                      onClick={() => {
                        onSelectUser(user);
                        onClose(); // Close modal after selection
                      }}
                    >
                      <div className="avatar">
                        <div className="w-8 rounded-full">
                          <img
                            src={user.profileImg || "/avatar-placeholder.png"}
                            alt={`${user.username}'s profile`}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold truncate max-w-[120px]">
                          {user.fullName}
                        </span>
                        <span className="text-sm text-gray-500 truncate max-w-[120px]">
                          @{user.username}
                        </span>
                      </div>
                    </div>
                  )
              )}
            </>
          ) : (
            <p className="p-4 text-gray-400 text-center">
              No followed users found matching your search.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body // Portal to the document body
  );
};

export default SearchFollowedUsersModal