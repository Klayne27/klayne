import { useEffect, useRef, useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"
import { IoArrowBack } from "react-icons/io5"
import { useGetSuggestedUsersInfinite } from "../features/users/usersHooks/useUserQueries"
import { useFollow } from "../features/users/usersHooks/useUserMutations"
import { useAuthUser } from "../features/auth/authHooks/useAuthUser"
import { useAppStore } from "../store/useAppStore"
import LoadingSpinner from "../components/common/LoadingSpinner"
import UserFullName from "../components/common/UserFullname"
import { truncateText } from "../utils/truncateText"
import FollowButton from "../components/common/FollowButton"
import UserAvatar from "../components/common/UserAvatar"
import ConfirmationModal from "../components/common/ConfirmationModal"

/**
 * `mobile` prop – when true (set by ConnectPage) the sticky back-button
 * header is hidden because ConnectPage already renders a shared header.
 */
const SuggestedUsersPage = ({ mobile = false }) => {
  const navigate = useNavigate()
  const { authUser: currentUser } = useAuthUser()
  const { follow } = useFollow()
  // const showUnfollowModal = useAppStore((s) => s.showUnfollowModal)
  // const setShowUnfollowModal = useAppStore((s) => s.setShowUnfollowModal)
  const [userToUnfollow, setUserToUnfollow] = useState(null)

  const [showUnfollowModal, setShowUnfollowModal] = useState(false)

  const { users, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useGetSuggestedUsersInfinite()

  // ── Infinite scroll ───────────────────────────────────────────────────────
  const sentinelRef = useRef(null)

  const handleObserver = useCallback(
    (entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  )

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [handleObserver])

  // ── Unfollow modal helpers ────────────────────────────────────────────────
  const openUnfollowModal = (user) => {
    setUserToUnfollow(user)
    setShowUnfollowModal(true)
  }
  const closeUnfollowModal = () => {
    setShowUnfollowModal(false)
    setUserToUnfollow(null)
  }
  const handleConfirmUnfollow = () => {
    if (userToUnfollow) {
      follow(userToUnfollow._id)
      closeUnfollowModal()
    }
  }

  return (
    <div className="min-h-screen w-full border-accent">
      {/* Header – hidden when rendered inside ConnectPage (mobile) */}
      {!mobile && (
        <div className="z-5 sticky top-0 flex items-center gap-4 border-b border-accent bg-base-100/80 px-4 py-3 backdrop-blur">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-secondary/40"
          >
            <IoArrowBack size={20} />
          </button>
          <h1 className="text-lg font-bold leading-tight">Follow</h1>
        </div>
      )}

      <div className="pb-4 pt-4">
        <span className="px-4 text-xl font-bold">Suggested for you</span>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="md" />
        </div>
      )}
      {isError && (
        <div className="py-16 text-center text-sm text-slate-500">
          Something went wrong. Please try again.
        </div>
      )}

      {!isLoading &&
        users.map((user) => (
          <SuggestedUserRow
            key={user._id}
            user={user}
            currentUser={currentUser}
            isFollowing={currentUser?.following?.includes(user._id)}
            openUnfollowModal={openUnfollowModal}
            navigate={navigate}
          />
        ))}

      {/* Sentinel */}
      <div ref={sentinelRef} className="py-2" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-6">
          <LoadingSpinner size="sm" />
        </div>
      )}
      {!isLoading && !hasNextPage && users.length > 0 && (
        <p className="py-8 text-center text-sm text-slate-500">You've seen everyone!</p>
      )}
      {!isLoading && users.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-lg font-semibold">No suggestions right now</p>
          <p className="mt-1 text-sm text-slate-500">Check back later for new people to follow.</p>
        </div>
      )}

      <ConfirmationModal
        isOpen={showUnfollowModal}
        modalTitle={
          <>
            Unfollow <p>@{userToUnfollow?.username}</p>
          </>
        }
        message="Their posts will no longer show up in your For You timeline. You can still view
          their profile, unless their posts are protected."
        confirmButtonText="Unfollow"
        onConfirm={handleConfirmUnfollow}
        onClose={closeUnfollowModal}
        danger={false}
      />
    </div>
  )
}

const SuggestedUserRow = ({ user, currentUser, isFollowing, openUnfollowModal, navigate }) => (
  <div
    className="flex w-full cursor-pointer items-start gap-3 px-4 py-4 transition hover:bg-secondary/30"
    onClick={(e) => {
      e.stopPropagation()
      navigate(`/profile/${user.username}`)
    }}
  >
    <div className="mt-0.5 flex-shrink-0">
      <UserAvatar user={user} size="md" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-1 text-left">
        <UserFullName user={user} className="truncate font-bold hover:underline" />
        {user.isVerified && <img src="/verified2.png" className="size-[15px]" alt="verified" />}
        {user.isGoldVerified && (
          <img src="/gold-verified2.png" className="size-[15px]" alt="gold verified" />
        )}
        {user.isCha && <img src="/cha.png" className="size-[13px] rounded-md" alt="cha" />}
      </div>
      <p className="text-left text-sm text-slate-500">@{truncateText(user.username, 20)}</p>
      {user.bio && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-base-content/80">{user.bio}</p>
      )}
    </div>
    <div className="flex-shrink-0 pt-0.5">
      <FollowButton
        user={user}
        currentUserId={currentUser?._id}
        isFollowing={isFollowing}
        openUnfollowModal={openUnfollowModal}
      />
    </div>
  </div>
)

export default SuggestedUsersPage
