import { useEffect, useRef, useState, useMemo } from "react"
import UserListItem from "./UserListItem"
import LoadingSpinner from "./LoadingSpinner"
import { IoClose } from "react-icons/io5"
import { IoSearchOutline } from "react-icons/io5"
import { useGetFollowList } from "../../features/users/usersHooks/useUserQueries"

const FollowListModal = ({ userId, type, onClose, page }) => {
  const modalTitle = type === "following" ? "Following" : "Followers"
  const dialogRef = useRef(null)
  const [query, setQuery] = useState("")

  const { users, isLoading, error } = useGetFollowList(userId, type)

  const filteredUsers = useMemo(() => {
    if (!users) return []
    if (!query.trim()) return users
    const q = query.toLowerCase()
    return users.filter(
      (u) => u.username?.toLowerCase().includes(q) || u.fullName?.toLowerCase().includes(q),
    )
  }, [users, query])

  useEffect(() => {
    const dialogElement = dialogRef.current
    if (!dialogElement) return
    const handleDialogClose = () => onClose()
    dialogElement.addEventListener("close", handleDialogClose)
    return () => dialogElement.removeEventListener("close", handleDialogClose)
  }, [onClose])

  // Reset search when modal type changes
  useEffect(() => {
    setQuery("")
  }, [type])

  const handleMouseDownOnDialog = (e) => {
    if (dialogRef.current && e.target === dialogRef.current) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      id={`${page === "profilePage" ? `follow_list_modal_${type}` : `follow_modal_list_${type}`}`}
      className="modal modal-middle flex justify-center px-10 sm:modal-middle"
      onMouseDown={handleMouseDownOnDialog}
    >
      <div className="relative w-[350px] rounded-2xl border border-accent bg-base-100 md:w-[500px]">
        <h3 className="border-b border-accent px-4 py-2 text-center text-lg font-bold">
          {modalTitle}
        </h3>

        {/* Search bar */}
        <div className=" border-accent px-4 py-3">
          <div className="flex items-center gap-2 rounded-full bg-base-200 px-3 py-1.5">
            <IoSearchOutline className="shrink-0 text-base-content/40" size={16} />
            <input
              type="text"
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-base-content/40"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="shrink-0 text-base-content/40 hover:text-base-content"
              >
                <IoClose size={14} />
              </button>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="flex h-40 items-center justify-center">
            <LoadingSpinner size="sm" />
          </div>
        )}
        {error && <p className="p-4 text-center text-red-500">{error.message}</p>}

        {!isLoading && (
          <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <UserListItem key={user._id} user={user} onModalClose={onClose} />
              ))
            ) : (
              <p className="py-8 text-center text-slate-500">
                {query
                  ? "No users match your search."
                  : type === "following"
                    ? "Not following anyone yet."
                    : "No followers yet."}
              </p>
            )}
          </div>
        )}

        <div className="modal-action">
          <button
            className="btn btn-circle btn-ghost btn-sm absolute right-2 top-2"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
          >
            <IoClose size={25} />
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default FollowListModal
