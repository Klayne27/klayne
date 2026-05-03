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
    <div className="relative min-w-0 flex-1">
      <div className="mb-1 flex w-full items-center gap-2 rounded-full border border-accent px-3 py-2">
        <CiSearch className="size-5 shrink-0 text-gray-400" />
        <input
          type="text"
          placeholder="Search"
          // ADD: min-w-0 so the input itself can shrink inside the flex row
          className="z-10 min-w-0 grow bg-base-100 focus:outline-none"
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
        <div
          className={`absolute left-0 top-[51px] z-50 max-h-[500px] w-full overflow-hidden overflow-y-auto rounded-2xl border border-accent bg-base-100 shadow-md shadow-gray-400`}
          // Clamp to viewport on mobile so it never extends past the right edge
          style={{ maxWidth: "calc(100vw - 1.25rem)" }}
        >
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
                    <div className="shrink-0">
                      <div className="w-8 rounded-full">
                        <UserAvatar user={user} size={"sm"} isAnon={hasBlockedYou} />
                      </div>
                    </div>
                    {/* ADD: min-w-0 so text truncation works in flex child */}
                    <div className="flex min-w-0 flex-col overflow-hidden">
                      <UserFullName
                        user={user}
                        className="min-w-0 truncate font-semibold"
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
