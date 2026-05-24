import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { CiSearch } from "react-icons/ci"
import { useAuthUser } from "../../features/auth/authHooks/useAuthUser"
import { getOptimizedImageUrl } from "../../utils/cloudinaryUtils"
import { useSearchUsers } from "../../features/users/usersHooks/useUserMutations"
import UserFullName from "./UserFullname"
import { getNameplateClass } from "../../utils/getNameplateClass"
import UserAvatar from "./UserAvatar"
import { useAppStore } from "../../store/useAppStore"

const SearchPanel = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  // const [showResults, setShowResults] = useState(false)

  const showResults = useAppStore((s) => s.showResults)
  const setShowResults = useAppStore((s) => s.setShowResults)

  const { authUser } = useAuthUser()

  useEffect(() => {
    const timerId = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(timerId)
  }, [searchQuery])

  const { suggestedUsers, isLoadingSuggestedUsers, isError, error, isFetching } =
    useSearchUsers(debouncedQuery)

  useEffect(() => {
    setShowResults(!!(debouncedQuery || suggestedUsers?.length > 0 || isError))
  }, [debouncedQuery, suggestedUsers, isError, setShowResults])

  return (
    <div className="relative w-full min-w-0">
      {/* Input Container */}
      <div className="flex w-full items-center gap-2 rounded-full border border-accent bg-base-100 px-3 py-2">
        <CiSearch className="size-5 shrink-0 text-gray-400" />
        <input
          type="text"
          placeholder="Search"
          className="min-w-0 grow bg-transparent focus:outline-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (debouncedQuery || suggestedUsers?.length > 0 || isError) setShowResults(true)
          }}
          onBlur={() => setTimeout(() => setShowResults(false), 150)}
        />
      </div>

      {/* Results Dropdown */}
      {showResults && (debouncedQuery.length > 0 || suggestedUsers?.length > 0) && (
        <div
          className="absolute left-0 top-[45px] z-[100] max-h-[70vh] w-full overflow-x-hidden overflow-y-hidden rounded-xl border border-accent bg-base-100 shadow-xl"
          // Removing the style={{maxWidth}} calc.
          // w-full here makes it exactly the width of the search input bar.
        >
          {(isLoadingSuggestedUsers || isFetching) && debouncedQuery ? (
            <p className="p-4 text-center text-sm text-slate-500">Searching...</p>
          ) : isError ? (
            <p className="p-4 text-center text-sm text-red-500">{error.message}</p>
          ) : suggestedUsers?.length > 0 ? (
            <div className="flex flex-col">
              {suggestedUsers.map((user) => (
                <Link
                  to={`/profile/${user.username}`}
                  key={user._id}
                  className={`${getNameplateClass(user?.equipped.nameplate)} flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/20`}
                  onClick={() => {
                    setSearchQuery("")
                    setShowResults(false)
                  }}
                >
                  <div className="shrink-0">
                    <UserAvatar
                      user={user}
                      size="sm"
                      isAnon={user.blockedUsers.includes(authUser._id)}
                    />
                  </div>
                  <div className="flex min-w-0 flex-col items-start">
                    <div className="flex items-center justify-center gap-1">
                      
                    <UserFullName
                      user={user}
                      className="truncate text-[15px] font-bold"
                      style={user.nameColor ? { color: user.nameColor } : undefined}
                      />
                    {user.isVerified && (
                      <img src="/verified2.png" className="size-[16px]" alt="verified" />
                    )}
                    {user.isGoldVerified && (
                      <img src="/gold-verified2.png" className="size-[16px]" alt="gold verified" />
                    )}
                    {user.isCha && (
                      <img src="/cha.png" className="size-[14px] rounded-md" alt="cha" />
                    )}
                    </div>
                    <span className="truncate text-sm text-slate-500">@{user.username}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            debouncedQuery && (
              <p className="p-4 text-center text-sm text-slate-500">No users found.</p>
            )
          )}
        </div>
      )}
    </div>
  )
}

export default SearchPanel
