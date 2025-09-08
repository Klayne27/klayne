import { useEffect, useRef, useState } from "react"
import { IoSearch, IoSettingsOutline } from "react-icons/io5"
import ConversationItem from "./ConversationItem"
import React from "react"
import { useGetOrCreateConversation } from "./privateChatHooks/useGetOrCreateConversation"
import { useGetFollowedUsersForMessaging } from "./privateChatHooks/useGetFollowedUsersForMessaging" // Updated hook import
import { useSocket } from "../../../context/SocketContext"
import { FaCog } from "react-icons/fa"
import DropdownMenu from "../../../components/common/DropdownMenu"
import { useAuthUser } from "../../auth/authHooks/useAuthUser"
import { Link } from "react-router-dom"
import { useUpdateStatusPreference } from "../../users/usersHooks/useUpdateStatusPreference"

const ConversationsList = ({ conversations }) => {
  const { authUser } = useAuthUser()
  const [followedSearchQuery, setFollowedSearchQuery] = useState("")
  const [debouncedFollowedQuery, setDebouncedFollowedQuery] = useState("")
  const [showFollowedDropdown, setShowFollowedDropdown] = useState(false) // Controls dropdown visibility

  const searchInputWrapperRef = useRef(null)
  const { socket } = useSocket()

  const { updateStatus } = useUpdateStatusPreference()

  const handleStatusChange = (status) => {
    updateStatus(status)
    if (socket) {
      socket.emit("changeOnlineStatus", { status })
    }
  }

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedFollowedQuery(followedSearchQuery)
    }, 500)

    return () => {
      clearTimeout(timerId)
    }
  }, [followedSearchQuery])

  const {
    searchedFollowedUsers,
    isLoadingFollowedUsers,
    isErrorFollowedUsers,
    followedUsersError,
    isFetchingFollowedUsers,
  } = useGetFollowedUsersForMessaging(debouncedFollowedQuery) // Pass debounced query here

  // Mutation hook to get or create a conversation
  const { getOrCreateConversation, isCreatingConversation } = useGetOrCreateConversation()

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

  const isOnline = authUser?.statusPreference === "online"

  return (
    <div className="template flex h-full flex-col border-accent">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-black/0 p-4 backdrop-blur-sm">
        <h1 className="text-xl font-bold">Messages</h1>
        <DropdownMenu icon={<FaCog />}>
          <div className="mt-1 flex w-full flex-col">
            <span className="mb-2 px-4 text-xs text-gray-400">Set Status</span>
            <div className="mb-2 flex items-center gap-2 px-3">
              <Link to={`/profile/${authUser?.username}`} className="relative">
                <img
                  src={authUser.profileImg?.imageUrl || "avatar-placeholder.png"}
                  className="size-10 rounded-full"
                />
                {isOnline ? (
                  <span className="absolute -right-0.5 bottom-0 size-[14px] rounded-full border-2 border-base-100 bg-green-500"></span>
                ) : (
                  <span className="absolute -right-0.5 bottom-0 size-[14px] rounded-full border-2 border-base-100 bg-gray-500"></span>
                )}
              </Link>
              <div>
                <Link
                  to={`/profile/${authUser?.username}`}
                  className="font-semibold hover:underline"
                >
                  {authUser.fullName}
                </Link>
                <p className="text-sm text-slate-500">@{authUser.username}</p>
              </div>
            </div>
            <button
              className="flex w-full items-center gap-2 px-4 py-2 text-left font-semibold transition duration-200 hover:bg-gray-700/30"
              onClick={() => handleStatusChange("online")}
            >
              <span className="size-[14px] rounded-full border border-base-100 bg-green-500"></span>
              <div className="flex flex-col">
                <span className="text-sm">Online</span>
                <span className="text-xs text-gray-500">You will appear online</span>
              </div>
            </button>
            <button
              className="mr-16 flex w-full items-center gap-2 px-4 py-2 text-left font-semibold transition duration-200 hover:bg-gray-700/30"
              onClick={() => handleStatusChange("offline")}
            >
              <span className="size-[14px] rounded-full border border-base-100 bg-gray-500"></span>
              <div className="flex flex-col">
                <span className="text-sm">Offline</span>
                <span className="text-xs text-gray-500">You will appear offline</span>
              </div>
            </button>
          </div>
        </DropdownMenu>
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
