import { useEffect, useRef, useState } from "react"
import { IoSearch, IoSettingsOutline } from "react-icons/io5"
import ConversationItem from "./ConversationItem"
import React from "react"
import { useGetOrCreateConversation } from "../../../hooks/messagesHooks/useGetOrCreateConversation"
import { useGetFollowedUsersForMessaging } from "../../../hooks/messagesHooks/useGetFollowedUsersForMessaging" // Updated hook import

const ConversationsList = ({ conversations }) => {

  const [followedSearchQuery, setFollowedSearchQuery] = useState("")
  const [debouncedFollowedQuery, setDebouncedFollowedQuery] = useState("")
  const [showFollowedDropdown, setShowFollowedDropdown] = useState(false) // Controls dropdown visibility

  const searchInputWrapperRef = useRef(null)

  const [userIsOnline, setUserIsOnline] = useState(true)


  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedFollowedQuery(followedSearchQuery)
    }, 500)

    return () => {
      clearTimeout(timerId)
    }
  }, [followedSearchQuery])

  const {
    data: searchedFollowedUsers, // Renamed to clarify these are search results
    isLoading: isLoadingFollowedUsers,
    isError: isErrorFollowedUsers,
    error: followedUsersError,
    isFetching: isFetchingFollowedUsers,
  } = useGetFollowedUsersForMessaging(debouncedFollowedQuery) // Pass debounced query here

  // Mutation hook to get or create a conversation
  const { mutate: getOrCreateConversation, isPending: isCreatingConversation } =
    useGetOrCreateConversation()

  // Handler for when a followed user is selected from the dropdown
  const handleSelectFollowedUserForMessage = (selectedUser) => {
    if (isCreatingConversation) return

    setFollowedSearchQuery("")
    setShowFollowedDropdown(false)

    getOrCreateConversation(selectedUser._id)
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchInputWrapperRef.current && !searchInputWrapperRef.current.contains(event.target)) {
        setShowFollowedDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <div className="flex h-full flex-col border-accent">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-black/0 p-4 backdrop-blur-sm">
        <h1 className="text-xl font-bold">Messages</h1>

      </div>

      {/* Search Bar for followed users */}
      <div className="px-3 py-2">
        <div ref={searchInputWrapperRef} className="relative w-full">
          <IoSearch className="absolute top-1/2 mx-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search for a conversation"
            className="focus:border-accent/99 w-full rounded-full border border-accent bg-black/0 p-2 px-3 pl-8 text-sm focus:outline-none"
            value={followedSearchQuery}
            onChange={(e) => setFollowedSearchQuery(e.target.value)}
            onFocus={() => setShowFollowedDropdown(true)}
          />

          {/* Dropdown for followed users search results */}
          {showFollowedDropdown &&
          (debouncedFollowedQuery.length > 0 ||
            (searchedFollowedUsers && searchedFollowedUsers.length > 0)) ? (
            <div className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-[300px] w-full overflow-y-auto rounded-2xl border border-accent bg-base-100 shadow-md shadow-gray-400">
              {(isLoadingFollowedUsers || isFetchingFollowedUsers) && debouncedFollowedQuery ? (
                <p className="p-4 text-center text-gray-400">Searching followed users...</p>
              ) : isErrorFollowedUsers ? (
                <p className="p-4 text-center text-red-500">Error: {followedUsersError.message}</p>
              ) : searchedFollowedUsers && searchedFollowedUsers.length > 0 ? (
                <>
                  {searchedFollowedUsers.map((user) => (
                    <div
                      key={user._id}
                      className="flex cursor-pointer items-center gap-3 px-2 py-2 transition-colors hover:bg-secondary"
                      onClick={() => handleSelectFollowedUserForMessage(user)}
                    >
                      <div className="avatar">
                        <div className="w-8 rounded-full">
                          <img
                            src={user.profileImg?.imageUrl || "/avatar-placeholder.png"}
                            alt={`${user.username}'s profile`}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="max-w-[120px] truncate font-semibold">
                          {user.fullName}
                        </span>
                        <span className="max-w-[120px] truncate text-sm text-gray-500">
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
                <p className="p-4 text-center text-gray-400">
                  No followed users found matching your search.
                </p>
              ) : (
                // This message appears when the dropdown is shown but no query is typed yet
                <p className="p-4 text-center text-gray-400">
                  Start typing to search your followed users.
                </p>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="scrollbar-on-hover flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            <p className="mb-2 text-lg font-bold">No messages yet</p>
            <p>When you follow someone, you'll be able to message them here.</p>
          </div>
        ) : (
          conversations.map((conv) => <ConversationItem key={conv._id} conv={conv} />)
        )}
      </div>
    </div>
  )
}

export default React.memo(ConversationsList)
