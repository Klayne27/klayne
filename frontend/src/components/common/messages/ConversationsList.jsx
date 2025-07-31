import { useEffect, useRef, useState } from "react";
import { IoSearch, IoSettingsOutline } from "react-icons/io5";
import { useAuthUser } from "../../../hooks/authHooks/useAuthUser";
import ConversationItem from "./ConversationItem";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useGetOrCreateConversation } from "../../../hooks/messagesHooks/useGetOrCreateConversation";
import { useGetFollowedUsersForMessaging } from "../../../hooks/messagesHooks/useGetFollowedUsersForMessaging"; // Updated hook import
import { showAppToast } from "../../../utils/showAppToast";

const ConversationsList = ({
  conversations,
}) => {
  const { authUser: currentUser } = useAuthUser();
  const navigate = useNavigate();

  // State for the main conversation list search (currently commented out in JSX)
  const [searchTerm, setSearchTerm] = useState("");

  // State for the followed users search dropdown
  const [followedSearchQuery, setFollowedSearchQuery] = useState("");
  const [debouncedFollowedQuery, setDebouncedFollowedQuery] = useState("");
  const [showFollowedDropdown, setShowFollowedDropdown] = useState(false); // Controls dropdown visibility

  // Ref to the input wrapper to measure its width if needed, or simply for focus/blur management
  const searchInputWrapperRef = useRef(null);

  // Debounce logic for the followed users search
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedFollowedQuery(followedSearchQuery);
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [followedSearchQuery]);

  // Fetch followed users based on debounced query
  // This will now only fetch when debouncedFollowedQuery has a value
  const {
    data: searchedFollowedUsers, // Renamed to clarify these are search results
    isLoading: isLoadingFollowedUsers,
    isError: isErrorFollowedUsers,
    error: followedUsersError,
    isFetching: isFetchingFollowedUsers,
  } = useGetFollowedUsersForMessaging(debouncedFollowedQuery); // Pass debounced query here

  // Mutation hook to get or create a conversation
  const { mutate: getOrCreateConversation, isPending: isCreatingConversation } =
    useGetOrCreateConversation();

  // Filter existing conversations based on the main search term
  const filteredConversations = conversations.filter((conv) => {
    const otherUser = conv.participants.find(
      (p) => p?._id.toString() !== currentUser._id.toString()
    );
    return (
      otherUser && otherUser.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Handler for when a followed user is selected from the dropdown
  const handleSelectFollowedUserForMessage = (selectedUser) => {
    if (isCreatingConversation) return;

    // Clear the search input and hide the dropdown
    setFollowedSearchQuery("");
    setShowFollowedDropdown(false);

    getOrCreateConversation(selectedUser._id, {
      onSuccess: (conversation) => {
        if (conversation && conversation._id) {
          navigate(`/messages/${conversation._id}`);
        } else {
          console.error("No conversation ID received after get/create conversation");
          showAppToast("Failed to open chat: Conversation ID missing.");
        }
      },
      onError: (err) => {
        console.error("Failed to open chat:", err);
      },
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchInputWrapperRef.current &&
        !searchInputWrapperRef.current.contains(event.target)
      ) {
        setShowFollowedDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-col h-full border-accent">
      {/* Header */}
      <div className="sticky top-0 z-10 p-4 flex justify-between items-center backdrop-blur-sm bg-black/0">
        <h1 className="font-bold text-xl">Messages</h1>
        <div className="rounded-full hover:bg-gray-800 p-1.5 cursor-pointer">
          <IoSettingsOutline className="w-4" />
        </div>
      </div>

      {/* Search Bar for followed users */}
      <div className="px-3 py-2">
        <div ref={searchInputWrapperRef} className="relative w-full">
          <IoSearch className="absolute w-4 h-4 text-gray-500 mx-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search for a conversation"
            className="text-sm w-full p-2 px-3 rounded-full bg-black/0 border-accent border focus:border-accent/99 focus:outline-none pl-8"
            value={followedSearchQuery}
            onChange={(e) => setFollowedSearchQuery(e.target.value)}
            onFocus={() => setShowFollowedDropdown(true)}
          />

          {/* Dropdown for followed users search results */}
          {showFollowedDropdown &&
          (debouncedFollowedQuery.length > 0 ||
            (searchedFollowedUsers && searchedFollowedUsers.length > 0)) ? (
            <div className="max-h-[300px] w-full overflow-y-auto border rounded-2xl absolute top-[calc(100%+8px)] left-0 z-50 bg-base-100 border-accent shadow-md shadow-gray-400">
              {(isLoadingFollowedUsers || isFetchingFollowedUsers) &&
              debouncedFollowedQuery ? (
                <p className="p-4 text-gray-400 text-center">
                  Searching followed users...
                </p>
              ) : isErrorFollowedUsers ? (
                <p className="p-4 text-red-500 text-center">
                  Error: {followedUsersError.message}
                </p>
              ) : searchedFollowedUsers && searchedFollowedUsers.length > 0 ? (
                <>
                  {searchedFollowedUsers.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center gap-3 py-2 hover:bg-secondary px-2 transition-colors cursor-pointer"
                      onClick={() => handleSelectFollowedUserForMessage(user)}
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
                  ))}
                </>
              ) : debouncedFollowedQuery &&
                !isLoadingFollowedUsers &&
                !isFetchingFollowedUsers &&
                searchedFollowedUsers.length === 0 ? (
                <p className="p-4 text-gray-400 text-center">
                  No followed users found matching your search.
                </p>
              ) : (
                // This message appears when the dropdown is shown but no query is typed yet
                <p className="p-4 text-gray-400 text-center">
                  Start typing to search your followed users.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-on-hover">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            <p className="text-lg font-bold mb-2">No messages yet</p>
            <p>When you follow someone, you'll be able to message them here.</p>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <ConversationItem
              key={conv._id}
              conv={conv}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default React.memo(ConversationsList);
