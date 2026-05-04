import { useEffect, useRef, useState } from "react"
import { IoSearch } from "react-icons/io5"
import ConversationItem from "./ConversationItem"
import React from "react"
import { useAuthUser } from "../../../auth/authHooks/useAuthUser"
import ConversationsListHeader from "./ConversationsListHeader"
import { getOptimizedImageUrl } from "../../../../utils/cloudinaryUtils"
import {
  useGetOrCreateConversation,
  useSearchConversations,
} from "../privateChatHooks/usePrivateChatQueries"

const ConversationsList = ({ conversations }) => {
  const { authUser } = useAuthUser()
  const [followedSearchQuery, setFollowedSearchQuery] = useState("")
  const [debouncedFollowedQuery, setDebouncedFollowedQuery] = useState("")
  const [showFollowedDropdown, setShowFollowedDropdown] = useState(false)
  const searchInputWrapperRef = useRef(null)

  useEffect(() => {
    const timerId = setTimeout(() => setDebouncedFollowedQuery(followedSearchQuery), 300)
    return () => clearTimeout(timerId)
  }, [followedSearchQuery])

  const { users, groupChats, isLoading, isFetching, isError, error } =
    useSearchConversations(debouncedFollowedQuery)

  const { getOrCreateConversation, isCreatingConversation } = useGetOrCreateConversation()

  const handleSelectUser = (selectedUser) => {
    if (isCreatingConversation) return
    setFollowedSearchQuery("")
    setShowFollowedDropdown(false)
    getOrCreateConversation({ targetUserId: selectedUser._id })
  }

  const handleSelectGroup = (conv) => {
    if (isCreatingConversation) return

    setFollowedSearchQuery("")
    setShowFollowedDropdown(false)
    // Just navigate to the existing group — no need to create
    getOrCreateConversation({ existingConversationId: conv._id })
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchInputWrapperRef.current && !searchInputWrapperRef.current.contains(e.target)) {
        setShowFollowedDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const hasResults = users.length > 0 || groupChats.length > 0
  const showDropdown = showFollowedDropdown && (debouncedFollowedQuery.length > 0 || hasResults)

  return (
    <div className="template flex h-full flex-col border-accent border-l">
      <ConversationsListHeader />

      <div className="px-3 py-2">
        <div ref={searchInputWrapperRef} className="relative w-full">
          <IoSearch className="absolute top-1/2 mx-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search conversations"
            className="focus:border-accent/99 w-full rounded-full border border-accent bg-black/0 p-2 px-3 pl-8 text-sm focus:outline-none"
            value={followedSearchQuery}
            onChange={(e) => setFollowedSearchQuery(e.target.value)}
            onFocus={() => setShowFollowedDropdown(true)}
          />

          {showDropdown && (
            <div className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-[300px] w-full overflow-y-auto rounded-2xl border border-accent bg-base-100 shadow-md shadow-gray-400">
              {(isLoading || isFetching) && debouncedFollowedQuery ? (
                <p className="p-4 text-center text-gray-400">Searching...</p>
              ) : isError ? (
                <p className="p-4 text-center text-red-500">Error: {error.message}</p>
              ) : !hasResults && debouncedFollowedQuery ? (
                <p className="p-4 text-center text-gray-400">No results found.</p>
              ) : !debouncedFollowedQuery ? (
                <p className="p-4 text-center text-gray-400">Start typing to search.</p>
              ) : (
                <>
                  {groupChats.length > 0 && (
                    <>
                      <p className="px-3 pt-3 text-xs font-semibold uppercase text-gray-500">
                        Group Chats
                      </p>
                      {groupChats.map((conv) => (
                        <div
                          key={conv._id}
                          className="flex cursor-pointer items-center gap-3 px-2 py-2 transition-colors hover:bg-secondary"
                          onClick={() => handleSelectGroup(conv)}
                        >
                          <div className="avatar">
                            <div className="w-8 rounded-full">
                              <img
                                src={getOptimizedImageUrl(
                                  conv.avatar?.imageUrl || "/avatar-placeholder.png",
                                  "avatar",
                                )}
                                alt={conv.name}
                              />
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <span className="max-w-[120px] truncate font-semibold">
                              {conv.name}
                            </span>
                            <span className="max-w-[120px] truncate text-sm text-gray-500">
                              {conv.members?.length} members
                            </span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {users.length > 0 && (
                    <>
                      <p className="px-3 pt-3 text-xs font-semibold uppercase text-gray-500">
                        People
                      </p>
                      {users.map((user) => (
                        <div
                          key={user._id}
                          className="flex cursor-pointer items-center gap-3 px-2 py-2 transition-colors hover:bg-secondary"
                          onClick={() => handleSelectUser(user)}
                        >
                          <div className="avatar">
                            <div className="w-8 rounded-full">
                              <img
                                src={getOptimizedImageUrl(
                                  user.profileImg?.imageUrl || "/avatar-placeholder.png",
                                  "avatar",
                                )}
                                alt={user.username}
                              />
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <span
                              className="max-w-[120px] truncate font-semibold"
                              style={user.nameColor ? { color: user.nameColor } : undefined}
                            >
                              {user.fullName}
                            </span>
                            <span className="max-w-[120px] truncate text-sm text-gray-500">
                              @{user.username}
                            </span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="scrollbar-on-hover flex-1 overflow-y-auto overflow-x-hidden pb-12">
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
