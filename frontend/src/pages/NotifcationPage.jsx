import { useNavigate } from "react-router-dom"
import { IoChatbubbleSharp, IoSettingsOutline } from "react-icons/io5"
import { FaUser, FaHeart, FaRetweet, FaReply, FaWrench } from "react-icons/fa6"
import { FaTrashCan } from "react-icons/fa6"
import { formatPostDate } from "../utils/date"
import { useAuthUser } from "../features/auth/authHooks/useAuthUser"
import NotificationsSkeleton from "../components/skeletons/NotificationsSkeleton"
import { FaArrowLeft } from "react-icons/fa6"
import { FaAt } from "react-icons/fa"
import { useRef } from "react"
import { getOptimizedImageUrl } from "../utils/cloudinaryUtils"
import {
  useDeleteNotification,
  useDeleteNotifications,
  useGetNotifications,
} from "../features/notifications/notificationsHooks/useNotifications"

const NotificationPage = () => {
  const { notifications, isLoading } = useGetNotifications()
  const { deleteNotification } = useDeleteNotification()
  const { deleteNotifications } = useDeleteNotifications()
  const { authUser } = useAuthUser()
  const navigate = useNavigate()
  const dropdownToggleRef = useRef(null)

  const filteredNotifications = notifications?.filter((notification) => {
    if (
      (notification.type === "like" ||
        notification.type === "mention" ||
        notification.type === "repost" ||
        notification.type === "reply" ||
        notification.type === "replyLike" ||
        notification.type === "replyRepost" ||
        notification.type === "replyReply" ||
        notification.type === "boardComment" ||
        notification.type === "boardReply") &&
      notification.from?._id.toString() === authUser?._id.toString()
    ) {
      return false
    }
    return true
  })

  const handleProfileClick = (e, username) => {
    e.stopPropagation()
    navigate(`/profile/${username}`)
  }

  const handleNotificationItemClick = (e, notification) => {
    if (e.target.closest("button")) {
      return
    }

    let targetLink = ""

    if (notification.type === "follow") {
      targetLink = `/profile/${notification.from?.username}`
    } else if (notification.postId && notification.postId._id) {
      targetLink = `/${notification.postId.user?.username}/post/${notification.postId._id}`
    } else if (notification.type === "boardComment" || notification.type === "boardReply") {
      targetLink = `/board/${notification.boardPostId?._id}`
    } else {
      console.warn("Could not determine navigation link for notification:", notification)
      return
    }

    navigate(targetLink)
  }

  const handleDeleteAllNotifications = () => {
    deleteNotifications()

    if (dropdownToggleRef.current) {
      dropdownToggleRef.current.blur()
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case "follow":
        return <FaUser className="h-6 w-6 text-primary" />
      case "like":
        return <FaHeart className="h-6 w-6 text-red-500" />
      case "repost":
        return <FaRetweet className="h-6 w-6 text-green-500" />
      case "mention":
        return <FaAt className="h-6 w-6 text-purple-500" />
      case "reply":
        return <FaReply className="h-6 w-6 text-sky-400" />
      case "replyLike":
        return <FaHeart className="h-6 w-6 text-red-500" />
      case "replyRepost":
        return <FaRetweet className="h-6 w-6 text-green-500" />
      case "replyReply":
        return <FaReply className="h-6 w-6 text-sky-400" />
      case "boardComment":
        return <IoChatbubbleSharp className="h-6 w-6 text-teal-400" />
      case "boardReply":
        return <FaReply className="h-6 w-6 text-sky-400" />
      default:
        return null
    }
  }

  const getNotificationMessage = (notification) => {
    const isAnon = notification.isAnonymousInteraction
    const displayUsername = isAnon ? "Anonymous" : notification.from?.username

    if (!displayUsername) return "A user"

    const prefix = isAnon ? "" : "@"

    switch (notification.type) {
      case "follow":
        return `${prefix}${displayUsername} followed you.`
      case "like":
        return `${prefix}${displayUsername} liked your post.`
      case "repost":
        return `${prefix}${displayUsername} reposted your post.`
      case "mention":
        return `${prefix}${displayUsername} mentioned you in a post.`
      case "reply":
        return `${prefix}${displayUsername} replied to your post.`
      case "replyLike":
        return `${prefix}${displayUsername} liked your reply.`
      case "replyRepost":
        return `${prefix}${displayUsername} reposted your reply.`
      case "replyReply":
        return `${prefix}${displayUsername} replied to your reply.`
      case "boardComment":
        return `@${displayUsername} commented on your board post.`
      case "boardReply":
        return `@${displayUsername} replied to your board comment.`
      default:
        return ""
    }
  }

  const contentToDisplay = (notif) => {
    if (notif.postId) {
      return notif.postId.text
    } else if (notif.boardCommentId) {
      return notif.boardCommentId.content
    }
  }

  return (
    <>
      <div className="template mx-auto min-h-screen w-full flex-1 overflow-x-hidden border-accent md:max-w-3xl lg:max-w-4xl">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-accent bg-opacity-20 px-3 py-2 backdrop-blur-md md:gap-4 md:px-4 md:py-3.5">
          <button
            onClick={() => navigate(-1)}
            className="flex-shrink-0 rounded-full p-2.5 transition duration-200 hover:bg-gray-800"
          >
            <FaArrowLeft />
          </button>
          <h1 className="flex-1 truncate text-xl font-bold">Notifications</h1>
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-circle btn-ghost btn-sm">
              <IoSettingsOutline className="h-5 w-5" />
            </div>

            <ul
              tabIndex={0}
              className="menu dropdown-content z-[1] w-52 rounded-box border border-accent bg-base-100 p-2 shadow"
              ref={dropdownToggleRef}
            >
              <li>
                <a onClick={handleDeleteAllNotifications}>Delete all notifications</a>
              </li>
            </ul>
          </div>
        </div>

        {isLoading && (
          <div className="mt-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <NotificationsSkeleton key={i} />
            ))}
          </div>
        )}

        {filteredNotifications?.length === 0 && !isLoading && (
          <div className="p-4 text-center font-bold">No notifications 🤔</div>
        )}

        {filteredNotifications?.map((notification) => {
          const isGoldVerified = notification.from.isGoldVerified
          const isVerified = notification.from.isVerified
          const isAnon = notification.isAnonymousInteraction
          const isCha = notification.from.isCha

          let imgToDisplay = null

          if (notification.postId) {
            imgToDisplay = notification.postId
          } else if (notification.boardCommentId) {
            imgToDisplay = notification.boardCommentId
          }

          return (
            <div
              className="relative flex cursor-pointer gap-4 border-b border-accent p-4 transition-colors hover:bg-secondary"
              key={notification._id}
              onClick={(e) => handleNotificationItemClick(e, notification)}
            >
              <div className="mt-1 flex-shrink-0"> {getNotificationIcon(notification.type)}</div>
              <div className="flex w-full min-w-0 flex-col gap-2">
                <div className="flex items-start gap-2">
                  <div
                    className="avatar cursor-pointer"
                    onClick={(e) =>
                      !isAnon ? handleProfileClick(e, notification.from?.username) : ""
                    }
                  >
                    <div className="w-10 rounded-full">
                      <img
                        src={
                          isAnon
                            ? "/avatar-placeholder.png"
                            : getOptimizedImageUrl(
                                notification.from?.profileImg?.imageUrl ||
                                  "/avatar-placeholder.png",
                                "avatar",
                              )
                        }
                        alt="profile"
                      />
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex min-w-0 items-center gap-[2px]">
                      <span
                        className={`min-w-0 truncate font-bold ${!isAnon ? "cursor-pointer hover:underline" : ""}`}
                        onClick={(e) =>
                          !isAnon ? handleProfileClick(e, notification.from?.username) : null
                        }
                        style={
                          !isAnon && notification.from?.nameColor
                            ? { color: notification.from?.nameColor }
                            : undefined
                        }
                      >
                        {isAnon ? "Anonymous" : notification.from?.fullName}
                      </span>

                      {/* Only show verification badges if NOT anonymous */}
                      {!isAnon && isVerified && (
                        <img src="/verified2.png" className="size-[17px]" alt="Verified" />
                      )}

                      {!isAnon && isGoldVerified && (
                        <img
                          src="/gold-verified2.png"
                          className="size-[17px]"
                          alt="Gold Verified"
                        />
                      )}
                      {!isAnon && isCha && (
                        <img src="/cha.png" className="size-[15px] rounded-md" />
                      )}
                    </div>
                    <div className="min-w-0 truncate text-sm">
                      {getNotificationMessage(notification)}
                    </div>
                  </div>
                  <div className="flex" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="group rounded-full p-2 transition duration-200 hover:bg-red-600 hover:bg-opacity-15 hover:text-red-500"
                      onClick={() => deleteNotification(notification._id)}
                    >
                      <FaTrashCan
                        className="cursor-pointer text-slate-500 transition duration-200 group-hover:text-red-600"
                        size={15}
                      />
                    </button>
                  </div>
                </div>
                {/* Post Content Display */}
                {(notification.postId?.text ||
                  imgToDisplay?.img ||
                  notification.boardCommentId?.content) && (
                  <div className="mt-2 rounded-xl border border-accent p-3">
                    {notification.postId?.text ||
                      (notification.boardCommentId?.content && (
                        <p className="text-sm">{contentToDisplay(notification)}</p>
                      ))}
                    {imgToDisplay?.img && (
                      <div className="flex justify-center">
                        <img
                          src={getOptimizedImageUrl(imgToDisplay.img, "post")}
                          className="mt-2 max-h-72 rounded-xl object-contain"
                          alt="Content"
                        />
                      </div>
                    )}
                  </div>
                )}
                <span className="text-sm text-slate-500">
                  {formatPostDate(notification.createdAt)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

export default NotificationPage
