import { useNavigate } from "react-router-dom"
import { IoChatbubbleSharp, IoSettingsOutline } from "react-icons/io5"
import { FaUser, FaHeart, FaRetweet, FaReply, FaUserCheck } from "react-icons/fa6"
import { FaTrashCan } from "react-icons/fa6"
import { formatPostDate } from "../utils/date"
import { useAuthUser } from "../features/auth/authHooks/useAuthUser"
import NotificationsSkeleton from "../components/skeletons/NotificationsSkeleton"
import { FaArrowLeft } from "react-icons/fa6"
import { FaAt } from "react-icons/fa"
import { useRef, useState } from "react"
import { getOptimizedImageUrl } from "../utils/cloudinaryUtils"
import {
  useDeleteNotification,
  useDeleteNotifications,
  useGetNotifications,
} from "../features/notifications/notificationsHooks/useNotifications"
import UserFullName from "../components/common/UserFullname"
import { useSocket } from "../context/SocketContext"
import FollowRequestsTab from "../features/notifications/components/FollowRequestsTab"

const NotificationPage = () => {
  const [activeTab, setActiveTab] = useState("all") // "all" | "requests"
  const { followRequestCount } = useSocket()
  const GROUPING_WINDOW_MS = 24 * 60 * 60 * 1000

  const { notifications, isLoading } = useGetNotifications()
  const { deleteNotification } = useDeleteNotification()
  const { deleteNotifications } = useDeleteNotifications()
  const { authUser } = useAuthUser()
  const navigate = useNavigate()
  const dropdownToggleRef = useRef(null)

  const filteredNotifications = notifications?.filter((notification) => {
    if (notification.type === "followRequest") return false // ← add this line
    if (
      (notification.type === "like" ||
        notification.type === "mention" ||
        notification.type === "repost" ||
        notification.type === "reply" ||
        notification.type === "replyLike" ||
        notification.type === "replyRepost" ||
        notification.type === "replyReply" ||
        notification.type === "replyMention" ||
        notification.type === "boardComment" ||
        notification.type === "boardReply") &&
      notification.from?._id.toString() === authUser?._id.toString()
    ) {
      return false
    }
    return true
  })

  const getNotificationTargetKey = (notification) => {
    if (notification.postId?._id) return `post:${notification.postId._id}`
    if (notification.boardCommentId?._id) return `board-comment:${notification.boardCommentId._id}`
    if (notification.boardPostId?._id) return `board-post:${notification.boardPostId._id}`
    if (notification.type === "follow") return "profile"
    if (notification.type === "followRequestAccepted") return `user:${notification.from?._id}`
    return notification._id
  }

  const groupedNotifications = (() => {
    if (!filteredNotifications?.length) return []

    const groupsByTarget = new Map()
    const groups = []

    filteredNotifications.forEach((notification) => {
      const targetKey = `${notification.type}:${getNotificationTargetKey(notification)}`
      const existingGroups = groupsByTarget.get(targetKey) || []
      const notificationTime = new Date(notification.createdAt).getTime()
      const existing = existingGroups.find(
        (group) => Math.abs(group.anchorTimestamp - notificationTime) < GROUPING_WINDOW_MS,
      )

      if (!existing) {
        const group = {
          ...notification,
          _id: `${targetKey}:${notification._id}`,
          notificationIds: [notification._id],
          notifications: [notification],
          actors: notification.from ? [notification.from] : [],
          createdAt: notification.createdAt,
          anchorTimestamp: notificationTime,
        }

        existingGroups.push(group)
        groupsByTarget.set(targetKey, existingGroups)
        groups.push(group)
        return
      }

      existing.notificationIds.push(notification._id)
      existing.notifications.push(notification)

      if (
        notification.from &&
        !existing.actors.some(
          (actor) => actor?._id?.toString() === notification.from?._id?.toString(),
        )
      ) {
        existing.actors.push(notification.from)
      }

      if (new Date(notification.createdAt) > new Date(existing.createdAt)) {
        existing.createdAt = notification.createdAt
      }
    })

    return groups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  })()

  const handleProfileClick = (e, username) => {
    e.stopPropagation()
    if (!username) return
    navigate(`/profile/${username}`)
  }

  const handleNotificationItemClick = (e, notification) => {
    if (e.target.closest("button")) {
      return
    }

    let targetLink = ""

    if (notification.type === "follow" || notification.type === "followRequestAccepted") {
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

  const handleDeleteNotificationGroup = (notification) => {
    const notificationIds = notification.notificationIds || [notification._id]
    notificationIds.forEach((notificationId) => deleteNotification(notificationId))
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
      case "replyMention":
        return <FaAt className="h-6 w-6 text-purple-500" />
      case "boardComment":
        return <IoChatbubbleSharp className="h-6 w-6 text-teal-400" />
      case "boardReply":
        return <FaReply className="h-6 w-6 text-sky-400" />
      case "followRequestAccepted":
        return <FaUserCheck className="h-6 w-6 text-green-400" />
      default:
        return null
    }
  }

  const getActorSummary = (notification) => {
    const actors = notification.actors || (notification.from ? [notification.from] : [])
    const firstActor = actors[0]
    const firstName = notification.isAnonymousInteraction ? "Anonymous" : firstActor?.username
    const extraCount = Math.max(actors.length - 1, 0)

    if (!firstName) return "A user"
    if (extraCount === 0) return `${notification.isAnonymousInteraction ? "" : "@"}${firstName}`

    return `${notification.isAnonymousInteraction ? "" : "@"}${firstName} and ${extraCount} ${
      extraCount === 1 ? "other" : "others"
    }`
  }

  const getNotificationMessage = (notification) => {
    const isAnon = notification.isAnonymousInteraction
    const displayUsername = isAnon ? "Anonymous" : notification.from?.username
    const actorSummary = getActorSummary(notification)

    if (!displayUsername) return "A user"

    switch (notification.type) {
      case "follow":
        return `${actorSummary} followed you.`
      case "like":
        return `${actorSummary} liked your post.`
      case "repost":
        return `${actorSummary} reposted your post.`
      case "mention":
        return `${actorSummary} mentioned you in a post.`
      case "reply":
        return `${actorSummary} replied to your post.`
      case "replyLike":
        return `${actorSummary} liked your reply.`
      case "replyRepost":
        return `${actorSummary} reposted your reply.`
      case "replyReply":
        return `${actorSummary} replied to your reply.`
      case "replyMention":
        return `${actorSummary} mentioned you in a reply.`
      case "boardComment":
        return `${actorSummary} commented on your board post.`
      case "boardReply":
        return `${actorSummary} replied to your board comment.`
      case "followRequestAccepted":
        return `${actorSummary} accepted your follow request.`
      default:
        return ""
    }
  }

  const renderActorAvatars = (notification) => {
    const actors = notification.actors || (notification.from ? [notification.from] : [])
    const visibleActors = actors.slice(0, 4)
    const extraCount = Math.max(actors.length - visibleActors.length, 0)

    return (
      <div className="flex min-w-[44px] -space-x-3">
        {visibleActors.map((actor, index) => {
          const isAnonActor = notification.isAnonymousInteraction && index === 0

          return (
            <button
              key={actor?._id || `${notification._id}-${index}`}
              className="avatar cursor-pointer rounded-full ring-2 ring-base-100"
              onClick={(e) => !isAnonActor && handleProfileClick(e, actor?.username)}
              title={isAnonActor ? "Anonymous" : `@${actor?.username}`}
              type="button"
            >
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
            </button>
          )
        })}
        {extraCount > 0 && (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-base-300 text-xs font-bold ring-2 ring-base-100">
            +{extraCount}
          </div>
        )}
      </div>
    )
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
      <div className="template mx-auto min-h-screen w-full flex-1 overflow-x-hidden border-accent md:max-w-3xl md:border-x lg:max-w-4xl">
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

        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <div className="flex border-b border-accent">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              activeTab === "all"
                ? "border-b-2 border-primary text-primary"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`relative flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
              activeTab === "requests"
                ? "border-b-2 border-primary text-primary"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Requests
            {followRequestCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">
                {followRequestCount}
              </span>
            )}
          </button>
        </div>

        {activeTab === "requests" ? (
          <FollowRequestsTab />
        ) : (
          <>
            {isLoading && (
              <div className="mt-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <NotificationsSkeleton key={i} />
                ))}
              </div>
            )}
            {groupedNotifications?.length === 0 && !isLoading && (
              <div className="p-4 text-center font-bold">No notifications 🤔</div>
            )}
            {groupedNotifications?.map((notification) => {
              const firstActor = notification.actors?.[0] || notification.from
              const isGoldVerified = firstActor?.isGoldVerified
              const isVerified = firstActor?.isVerified
              const isAnon = notification.isAnonymousInteraction
              const isCha = firstActor?.isCha

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
                  <div className="mt-1 flex-shrink-0">
                    {" "}
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex w-full min-w-0 flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0">
                        {renderActorAvatars(notification)}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex min-w-0 items-center gap-[2px]">
                          {/* <span
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
                      </span> */}
                          <UserFullName
                            user={firstActor}
                            isAnon={isAnon}
                            className={`min-w-0 truncate font-bold ${!isAnon ? "cursor-pointer hover:underline" : ""}`}
                            onClick={(e) =>
                              !isAnon ? handleProfileClick(e, firstActor?.username) : null
                            }
                          />

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
                          onClick={() => handleDeleteNotificationGroup(notification)}
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
          </>
        )}
      </div>
    </>
  )
}

export default NotificationPage
