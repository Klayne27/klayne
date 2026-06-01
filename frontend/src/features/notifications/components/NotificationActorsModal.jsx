import { Link } from "react-router-dom"
import { IoClose } from "react-icons/io5"
import { getOptimizedImageUrl } from "../../../utils/cloudinaryUtils"
import UserFullName from "../../../components/common/UserFullname"

const NotificationActorsModal = ({ isOpen, onClose, notification }) => {
  if (!isOpen || !notification) return null

  const actors = notification.actors || (notification.from ? [notification.from] : [])
  const isAnonymous = notification.isAnonymousInteraction

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-700/70 px-4"
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
    >
      <div
        className="relative flex max-h-[75vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-accent bg-base-100 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-accent px-4 py-3">
          <h3 className="text-lg font-bold">People</h3>
          <button
            className="btn btn-circle btn-ghost btn-sm"
            onClick={onClose}
            type="button"
          >
            <IoClose size={24} />
          </button>
        </div>

        <div className="overflow-y-auto py-1">
          {actors.map((actor, index) => {
            const isAnonActor = isAnonymous && index === 0
            const profilePath = `/profile/${actor?.username}`

            const content = (
              <>
                <div className="avatar">
                  <div className="w-10 rounded-full">
                    <img
                      src={
                        isAnonActor
                          ? "/avatar-placeholder.png"
                          : getOptimizedImageUrl(
                              actor?.profileImg?.imageUrl || "/avatar-placeholder.png",
                              "avatar",
                            )
                      }
                      alt={isAnonActor ? "Anonymous profile" : `${actor?.username || "User"} profile`}
                    />
                  </div>
                </div>
                <div className="flex min-w-0 flex-col">
                  <UserFullName
                    user={actor}
                    isAnon={isAnonActor}
                    className="truncate text-sm font-bold"
                  />
                  <span className="truncate text-xs text-slate-500">
                    {isAnonActor ? "@anonymous" : `@${actor?.username}`}
                  </span>
                </div>
              </>
            )

            if (isAnonActor || !actor?.username) {
              return (
                <div
                  key={actor?._id || `${notification._id}-${index}`}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  {content}
                </div>
              )
            }

            return (
              <Link
                key={actor?._id || `${notification._id}-${index}`}
                to={profilePath}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary"
              >
                {content}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default NotificationActorsModal
