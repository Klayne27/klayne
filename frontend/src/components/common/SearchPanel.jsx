import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { CiSearch } from "react-icons/ci"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { getOptimizedImageUrl } from "../../utils/cloudinaryUtils"
import { useSearchUsers } from "../../features/users/usersHooks/useUserMutations"
import UserFullName from "./UserFullname"
import { getNameplateClass } from "../../utils/getNameplateClass"
import UserAvatar from "./UserAvatar"

const SearchPanel = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [showResults, setShowResults] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const { authUser } = useAuthUser()

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)

    return () => {
      clearTimeout(timerId)
    }
  }, [searchQuery])

  const { suggestedUsers, isLoadingSuggestedUsers, isError, error, isFetching } =
    useSearchUsers(debouncedQuery)

  

  useEffect(() => {
    if (debouncedQuery || suggestedUsers?.length > 0 || isError) {
      setShowResults(true)
    } else {
      setShowResults(false)
    }
  }, [debouncedQuery, suggestedUsers, isError])

  return (
    <div className="relative w-full md:block">
      <div className="mb-4 flex w-full items-center gap-2 rounded-full border border-accent px-3 py-2">
        <CiSearch className="size-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by username or name"
          className="focus:border-accent/99 z-10 grow bg-base-100 focus:outline-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (debouncedQuery || suggestedUsers?.length > 0 || isError) {
              setShowResults(true)
            }
          }}
          onBlur={() => {
            setTimeout(() => setShowResults(false), 100)
          }}
        />
      </div>

      {showResults && (debouncedQuery.length > 0 || suggestedUsers?.length > 0) ? (
        <div className="absolute left-0 top-[51px] z-50 max-h-[500px] w-full overflow-hidden rounded-2xl border border-accent bg-base-100 shadow-md shadow-gray-400">
          {(isLoadingSuggestedUsers || isFetching) && debouncedQuery ? (
            <p className="p-4 text-center text-gray-400">Searching...</p>
          ) : isError ? (
            <p className="p-4 text-center text-red-500">Error: {error.message}</p>
          ) : suggestedUsers && suggestedUsers.length > 0 ? (
            <>
              {suggestedUsers.map((user) => {
                const hasBlockedYou = user.blockedUsers.includes(authUser._id)
                const nameplateClass = getNameplateClass(user?.equipped.nameplate)

                return (
                  <Link
                    to={`/profile/${user.username}`}
                    key={user._id}
                    className={`${nameplateClass} flex items-center gap-3 px-2 py-2 transition-colors hover:bg-secondary/60`}
                    onClick={() => setSearchQuery("")}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                  >
                    <div className="">
                      <div className="w-8 rounded-full">
                        {/* <img
                          src={getOptimizedImageUrl(
                            hasBlockedYou || !user.profileImg?.imageUrl
                              ? "/avatar-placeholder.png"
                              : user.profileImg?.imageUrl,
                            "avatar",
                          )}
                          alt={`${user.username}'s profile`}
                        /> */}
                        <UserAvatar user={user} size={"sm"} isAnon={hasBlockedYou} />
                      </div>
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <UserFullName
                        user={user}
                        className={`min-w-0 truncate font-semibold`}
                        style={user.nameColor ? { color: user.nameColor } : undefined}
                      />
                      <span className="min-w-0 truncate text-sm text-slate-500">
                        @{user.username}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </>
          ) : debouncedQuery &&
            !isLoadingSuggestedUsers &&
            !isFetching &&
            suggestedUsers?.length === 0 ? (
            <p className="p-4 text-center text-slate-500">No users found.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default SearchPanel
