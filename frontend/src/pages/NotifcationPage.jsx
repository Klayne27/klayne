import { useNavigate } from "react-router-dom"
import { IoSettingsOutline } from "react-icons/io5"
import { FaUser, FaHeart, FaComment, FaRetweet, FaReply } from "react-icons/fa6"
import { FaTrashCan } from "react-icons/fa6"
import { useGetNotifications } from "../features/notifications/notificationsHooks/useGetNotifications"
import { useDeleteNotification } from "../features/notifications/notificationsHooks/useDeleteNotification"
import { useDeleteNotifications } from "../features/notifications/notificationsHooks/useDeleteNotifications"
import { formatPostDate } from "../utils/date"
import { useAuthUser } from "../features/auth/authHooks/useAuthUser"
import NotificationsSkeleton from "../components/skeletons/NotificationsSkeleton"
import { FaArrowLeft } from "react-icons/fa6"
import { FaAt } from "react-icons/fa"
import { useRef } from "react"

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
        notification.type === "comment" ||
        notification.type === "repost" ||
        notification.type === "commentLike" ||
        notification.type === "commentReply") &&
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
      if (
        notification.type === "commentReply" &&
        notification.commentId &&
        notification.commentId._id
      ) {
        targetLink = `/${notification.postId.user?.username}/post/${notification.postId._id}?commentId=${notification.commentId._id}`
      } else {
        targetLink = `/${notification.postId.user?.username}/post/${notification.postId._id}`
      }
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
      case "commentLike":
        return <FaHeart className="h-6 w-6 text-pink-500" />
      case "comment":
        return <FaComment className="h-6 w-6 text-blue-500" />
      case "commentReply":
        return <FaReply className="h-6 w-6 text-sky-500" />
      case "repost":
        return <FaRetweet className="h-6 w-6 text-green-500" />
      case "mention":
        return <FaAt className="h-6 w-6 text-purple-500" />
      default:
        return null
    }
  }

  const getNotificationMessage = (notification) => {
    switch (notification.type) {
      case "follow":
        return `@${notification.from?.username} followed you.`
      case "like":
        return `@${notification.from?.username} liked your post.`
      case "comment":
        return `@${notification.from?.username} commented on your post.`
      case "commentLike":
        return `@${notification.from?.username} liked your comment on ${notification?.postId?.user.username}'s post.`
      case "commentReply":
        return `@${notification.from?.username} replied to your comment on ${notification?.postId?.user.username}'s post.`
      case "repost":
        return `@${notification.from?.username} reposted your post.`
      case "mention":
        return `@${notification.from?.username} mentioned you in a post.`
      default:
        return ""
    }
  }

  return (
    <>
      <div className="mx-auto min-h-screen w-full flex-1 overflow-x-hidden border-accent md:max-w-3xl lg:max-w-4xl template">
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
            <NotificationsSkeleton />
            <NotificationsSkeleton />
            <NotificationsSkeleton />
            <NotificationsSkeleton />
            <NotificationsSkeleton />
            <NotificationsSkeleton />
            <NotificationsSkeleton />
            <NotificationsSkeleton />
            <NotificationsSkeleton />
            <NotificationsSkeleton />
          </div>
        )}

        {filteredNotifications?.length === 0 && !isLoading && (
          <div className="p-4 text-center font-bold">No notifications 🤔</div>
        )}

        {filteredNotifications?.map((notification) => {
          const isGoldVerified = notification.from.isGoldVerified
          const isVerified = notification.from.isVerified

          const isCommentNotification =
            notification.type === "comment" ||
            notification.type === "commentLike" ||
            notification.type === "commentReply"

          let contentToDisplay = null

          if (isCommentNotification && notification.commentId) {
            contentToDisplay = notification.commentId
          } else if (notification.postId) {
            contentToDisplay = notification.postId
          }

          return (
            <div
              className="relative flex cursor-pointer gap-4 border-b border-accent p-4 transition-colors hover:bg-secondary"
              key={notification._id}
              onClick={(e) => handleNotificationItemClick(e, notification)}
            >
              <div className="mt-1 flex-shrink-0"> {getNotificationIcon(notification.type)}</div>
              <div className="flex w-full flex-col gap-2">
                <div className="flex items-start gap-2">
                  <div
                    className="avatar cursor-pointer"
                    onClick={(e) => handleProfileClick(e, notification.from?.username)}
                  >
                    <div className="w-10 rounded-full">
                      <img
                        src={notification.from?.profileImg?.imageUrl || "/avatar-placeholder.png"}
                        alt={`${notification.from?.username}'s profile`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span
                        className="cursor-pointer font-bold hover:underline"
                        onClick={(e) => handleProfileClick(e, notification.from?.username)}
                      >
                        {notification.from?.fullName}
                      </span>

                      {isVerified && (
                        <img src="/verified2.png" className="size-[17px]" alt="Verified" />
                      )}

                      {isGoldVerified && (
                        <img src="/gold-verified2.png" className="size-[17px]" alt="Gold Verified" />
                      )}
                    </div>
                    <div className="text-sm">{getNotificationMessage(notification)}</div>
                  </div>
                </div>
                {/* Post Content Display */}
                {(contentToDisplay?.text || contentToDisplay?.img) && (
                  <div className="mt-2 rounded-xl border border-accent p-3">
                    {contentToDisplay?.text && <p className="text-sm">{contentToDisplay.text}</p>}
                    {contentToDisplay?.img && (
                      <div className="flex justify-center">
                        <img
                          src={contentToDisplay.img}
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
              <div className="absolute right-4 top-4" onClick={(e) => e.stopPropagation()}>
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
          )
        })}
      </div>
    </>
  )
}

export default NotificationPage
