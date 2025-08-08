import { useNavigate } from "react-router-dom"
import LoadingSpinner from "../../components/ui/LoadingSpinner"

import { IoSettingsOutline } from "react-icons/io5"
import { FaUser, FaHeart, FaComment, FaRetweet, FaReply } from "react-icons/fa6"
import { FiTrash } from "react-icons/fi"
import { useFetchNotifications } from "../../hooks/notificationsHooks/useFetchNotifications"
import { useDeleteNotification } from "../../hooks/notificationsHooks/useDeleteNotification"
import { useDeleteNotifications } from "../../hooks/notificationsHooks/useDeleteNotifications"
import { formatPostDate } from "../../utils/date"
import { useAuthUser } from "../../hooks/authHooks/useAuthUser"
import NotificationsSkeleton from "../../components/skeletons/NotificationsSkeleton"
import { FaArrowLeft } from "react-icons/fa6"

import { FaAt } from "react-icons/fa"
import { useRef } from "react"

const NotificationPage = () => {
  const { notifications, isLoading } = useFetchNotifications()
  const { deleteNotification, isDeleting } = useDeleteNotification()
  const { deleteNotifications } = useDeleteNotifications()
  const { authUser } = useAuthUser()
  const navigate = useNavigate()
  const dropdownToggleRef = useRef(null)

  const filteredNotifications = notifications?.filter((notification) => {
    if (
      (notification.type === "like" ||
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

  return (
    <>
      <div className="mx-auto min-h-screen w-full flex-1 overflow-x-hidden border-accent md:max-w-3xl lg:max-w-4xl">
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
          <div>
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

          return (
            <div
              className="relative flex cursor-pointer items-start gap-2 border-b border-accent px-3 py-4 transition-colors hover:bg-secondary sm:gap-4"
              key={notification._id}
              onClick={(e) => handleNotificationItemClick(e, notification)}
            >
              <div className="absolute right-3 top-3" onClick={(e) => e.stopPropagation()}>
                <button
                  className="group rounded-full p-2 transition duration-200 hover:bg-red-600 hover:bg-opacity-15 hover:text-red-500"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteNotification(notification._id)
                  }}
                >
                  <FiTrash
                    className="cursor-pointer text-slate-500 transition duration-200 group-hover:text-red-600"
                    size={20}
                  />
                </button>
              </div>

              <div className="mt-1 flex-shrink-0">
                {notification.type === "follow" && <FaUser className="h-7 w-7 text-primary" />}
                {notification.type === "like" && <FaHeart className="h-7 w-7 text-red-500" />}
                {notification.type === "commentLike" && (
                  <FaHeart className="h-7 w-7 text-pink-500" />
                )}
                {notification.type === "comment" && <FaComment className="h-7 w-7 text-blue-500" />}
                {notification.type === "commentReply" && (
                  <FaReply className="h-7 w-7 text-sky-500" />
                )}
                {notification.type === "repost" && <FaRetweet className="h-7 w-7 text-green-500" />}
                {notification.type === "mention" && <FaAt className="h-7 w-7 text-purple-500" />}
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-1">
                  <div
                    className="avatar flex-shrink-0 cursor-pointer"
                    onClick={(e) => handleProfileClick(e, notification.from?.username)}
                  >
                    <div className="w-8 rounded-full">
                      <img
                        src={notification.from?.profileImg?.imageUrl || "/avatar-placeholder.png"}
                        alt={`${notification.from?.username}'s profile`}
                      />
                    </div>
                  </div>
                  <span
                    className="w-fit max-w-full cursor-pointer truncate font-bold hover:underline"
                    onClick={(e) => handleProfileClick(e, notification.from?.username)}
                  >
                    @{notification.from?.username}
                  </span>
                  {isVerified && <img src="/verified.png" className="mr-1 size-[17px]" />}
                  {isGoldVerified && <img src="/gold-verified.png" className="mr-1 size-[17px]" />}
                  <span className="text-[8px]">●</span>
                  <span className="text-sm text-slate-500">
                    {formatPostDate(notification.createdAt)}
                  </span>
                </div>
                <span className="overflow-hidden text-ellipsis whitespace-normal text-sm">
                  {notification.type === "follow" && "followed you."}
                  {notification.type === "like" && (
                    <>
                      liked your post{" "}
                      {notification.postId && (
                        <span className="text-blue-400 hover:underline">
                          {notification.postId.text
                            ? `"${notification.postId.text.substring(0, 30)}${
                                notification.postId.text.length > 30 ? "..." : ""
                              }"`
                            : "original post"}
                        </span>
                      )}
                    </>
                  )}
                  {notification.type === "comment" && (
                    <>
                      commented on your post{" "}
                      {notification.postId && (
                        <span className="text-blue-400 hover:underline">
                          {notification.postId.text
                            ? `"${notification.postId.text.substring(0, 30)}${
                                notification.postId.text.length > 30 ? "..." : ""
                              }"`
                            : "your post"}
                        </span>
                      )}
                    </>
                  )}
                  {notification.type === "commentLike" && (
                    <>
                      liked your comment{" "}
                      {notification.commentId?.text && (
                        <span className="text-blue-400 hover:underline">
                          "{notification.commentId.text.substring(0, 30)}
                          {notification.commentId.text.length > 30 ? "..." : ""}"
                        </span>
                      )}{" "}
                      on post{" "}
                      {notification.postId && (
                        <span className="text-blue-400 hover:underline">
                          {notification.postId.text
                            ? `"${notification.postId.text.substring(0, 30)}${
                                notification.postId.text.length > 30 ? "..." : ""
                              }"`
                            : "your post"}
                        </span>
                      )}
                    </>
                  )}
                  {notification.type === "commentReply" && (
                    <>
                      replied to your comment{" "}
                      {notification.parentCommentId?.text && (
                        <span className="text-blue-400 hover:underline">
                          "{notification.parentCommentId.text.substring(0, 30)}
                          {notification.parentCommentId.text.length > 30 ? "..." : ""}"
                        </span>
                      )}{" "}
                      on post{" "}
                      {notification.postId && (
                        <span className="text-blue-400 hover:underline">
                          {notification.postId.text
                            ? `"${notification.postId.text.substring(0, 30)}${
                                notification.postId.text.length > 30 ? "..." : ""
                              }"`
                            : "your post"}
                        </span>
                      )}
                    </>
                  )}
                  {notification.type === "repost" && (
                    <>
                      reposted your post{" "}
                      {notification.postId && (
                        <span className="text-blue-400 hover:underline">
                          {notification.postId.text
                            ? `"${notification.postId.text.substring(0, 30)}${
                                notification.postId.text.length > 30 ? "..." : ""
                              }"`
                            : "your post"}
                        </span>
                      )}
                    </>
                  )}
                  {notification.type === "mention" && (
                    <>
                      mentioned you in a post{" "}
                      {notification.postId && (
                        <span className="text-blue-400 hover:underline">
                          {notification.postId.text
                            ? `"${notification.postId.text.substring(0, 30)}${
                                notification.postId.text.length > 30 ? "..." : ""
                              }"`
                            : "a post"}
                        </span>
                      )}
                    </>
                  )}
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
