import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../../components/common/LoadingSpinner";

import { IoSettingsOutline } from "react-icons/io5";
import { FaUser, FaHeart, FaCommentDots, FaRetweet, FaReply } from "react-icons/fa";
import { FiTrash } from "react-icons/fi";
import { useFetchNotifications } from "../../hooks/notificationsHooks/useFetchNotifications";
import { useDeleteNotification } from "../../hooks/notificationsHooks/useDeleteNotification";
import { useDeleteNotifications } from "../../hooks/notificationsHooks/useDeleteNotifications";
import { formatPostDate } from "../../utils/date";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";
import NotificationsSkeleton from "../../components/skeletons/NotificationsSkeleton";
import { FaArrowLeft } from "react-icons/fa6";

import { FaAt } from "react-icons/fa"; // Import an icon for mentions, e.g., FaAt, FaRegBell, or a custom one.

const NotificationPage = () => {
  const { notifications, isLoading } = useFetchNotifications();
  const { deleteNotification, isDeleting } = useDeleteNotification();
  const { deleteNotifications } = useDeleteNotifications();
  const { authUser } = useAuthUser();
  const navigate = useNavigate();

  const filteredNotifications = notifications?.filter((notification) => {
    // Keep this filter. It ensures users don't see notifications
    // for their own actions (liking their own post, etc.).
    // For "mention" type, we *do* want to show it if the authUser is mentioned,
    // even if they are the one making the post, unless you decide otherwise.
    // However, the backend logic should ideally prevent self-mentions.
    if (
      (notification.type === "like" ||
        notification.type === "comment" ||
        notification.type === "repost" ||
        notification.type === "commentLike" ||
        notification.type === "commentReply") &&
      notification.from?._id.toString() === authUser?._id.toString()
    ) {
      return false;
    }
    return true;
  });

  const handleProfileClick = (e, username) => {
    e.stopPropagation();
    navigate(`/profile/${username}`);
  };

  const handleNotificationItemClick = (e, notification) => {
    if (e.target.closest("button")) {
      return;
    }

    let targetLink = "";

    if (notification.type === "follow") {
      targetLink = `/profile/${notification.from?.username}`;
    } else if (notification.postId && notification.postId._id) {
      // This path is correct for likes, comments, reposts, AND mentions
      targetLink = `/${notification.postId.user?.username}/post/${notification.postId._id}`;
    } else {
      console.warn("Could not determine navigation link for notification:", notification);
      return;
    }

    navigate(targetLink);
  };

  return (
    <>
      <div className="flex-1 border-accent min-h-screen w-full overflow-x-hidden md:max-w-3xl lg:max-w-4xl mx-auto">
        <div className="flex items-center gap-2 md:gap-4 px-3 md:px-4 py-2 md:py-3.5 border-accent sticky top-0 z-10 bg-opacity-20 backdrop-blur-md">
          <button
            onClick={() => navigate(-1)}
            className="hover:bg-gray-800 rounded-full p-2.5 transition duration-200 flex-shrink-0"
          >
            <FaArrowLeft />
          </button>
          <h1 className="font-bold text-xl flex-1 truncate">Notifications</h1>
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle btn-sm">
              <IoSettingsOutline className="w-5 h-5" />
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52 border border-accent"
            >
              <li>
                <a onClick={deleteNotifications}>
                  {isDeleting ? <LoadingSpinner size="sm" /> : "Delete all notifications"}
                </a>
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
          <div className="text-center p-4 font-bold">No notifications 🤔</div>
        )}

        {filteredNotifications?.map((notification) => {
          return (
            <div
              className="border-b border-accent px-3 py-4 relative flex items-start gap-2 sm:gap-4 hover:bg-secondary transition-colors cursor-pointer"
              key={notification._id}
              onClick={(e) => handleNotificationItemClick(e, notification)}
            >
              <div
                className="absolute right-3 top-3"
                onClick={(e) => e.stopPropagation()}
              >
                {isDeleting ? (
                  <LoadingSpinner size="xs" />
                ) : (
                  <button
                    className="group hover:bg-red-600 duration-200 transition hover:text-red-500 hover:bg-opacity-15 rounded-full p-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification._id);
                    }}
                  >
                    <FiTrash
                      className="group-hover:text-red-600 transition duration-200 cursor-pointer text-gray-500"
                      size={20}
                    />
                  </button>
                )}
              </div>

              <div className="flex-shrink-0 mt-1">
                {notification.type === "follow" && (
                  <FaUser className="w-7 h-7 text-primary" />
                )}
                {notification.type === "like" && (
                  <FaHeart className="w-7 h-7 text-red-500" />
                )}
                {notification.type === "commentLike" && (
                  <FaHeart className="w-7 h-7 text-pink-500" />
                )}
                {notification.type === "comment" && (
                  <FaCommentDots className="w-7 h-7 text-blue-500" />
                )}
                {notification.type === "commentReply" && (
                  <FaReply className="w-7 h-7 text-sky-500" />
                )}
                {notification.type === "repost" && (
                  <FaRetweet className="w-7 h-7 text-green-500" />
                )}
                {notification.type === "mention" && ( // NEW: Mention icon
                  <FaAt className="w-7 h-7 text-purple-500" />
                )}
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex gap-1 items-center">
                  <div
                    className="avatar flex-shrink-0 cursor-pointer"
                    onClick={(e) => handleProfileClick(e, notification.from?.username)}
                  >
                    <div className="w-8 rounded-full">
                      <img
                        src={notification.from?.profileImg || "/avatar-placeholder.png"}
                        alt={`${notification.from?.username}'s profile`}
                      />
                    </div>
                  </div>
                  <span
                    className="font-bold truncate w-fit max-w-full cursor-pointer hover:underline"
                    onClick={(e) => handleProfileClick(e, notification.from?.username)}
                  >
                    @{notification.from?.username}
                  </span>
                  <span className="text-[8px]">●</span>
                  <span className="text-gray-500 text-sm">
                    {formatPostDate(notification.createdAt)}
                  </span>
                </div>
                <span className="text-sm overflow-hidden text-ellipsis whitespace-normal">
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
                          `"${notification.parentCommentId.text.substring(0, 30)}$
                          {notification.parentCommentId.text.length > 30 ? "..." : ""}"`
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
                  {notification.type === "mention" && ( // NEW: Render mention text
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
          );
        })}
      </div>
    </>
  );
};
export default NotificationPage;
