// src/pages/NotificationPage.jsx
import { Link } from "react-router-dom";
import LoadingSpinner from "../../components/common/LoadingSpinner";

import { IoSettingsOutline } from "react-icons/io5";
import { FaUser, FaHeart, FaCommentDots, FaRetweet, FaReply } from "react-icons/fa"; // Added FaReply for comment replies
import { FiTrash } from "react-icons/fi";
import { useFetchNotifications } from "../../hooks/notificationsHooks/useFetchNotifications";
import { useDeleteNotification } from "../../hooks/notificationsHooks/useDeleteNotification";
import { useDeleteNotifications } from "../../hooks/notificationsHooks/useDeleteNotifications";
import { formatPostDate } from "../../utils/date";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";

const NotificationPage = () => {
  const { notifications, isLoading } = useFetchNotifications();
  const { deleteNotification } = useDeleteNotification(); // Assuming this hook handles single notification deletion
  const { deleteNotifications, isDeleting } = useDeleteNotifications(); // Assuming this hook handles deleting all
  const { authUser } = useAuthUser();

  const filteredNotifications = notifications?.filter((notification) => {
    // Generally, notifications should not be sent for self-interactions from the backend.
    // If the backend prevents sending notifications to 'from === to', these client-side filters
    // might be redundant but act as a safeguard.
    // Keeping existing filter for 'like', 'comment', 'repost'.
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

  return (
    <>
      <div className="flex-1 border-r border-gray-700 min-h-screen w-full overflow-x-hidden md:max-w-3xl lg:max-w-4xl mx-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <p className="font-bold text-xl">Notifications</p>
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle btn-sm">
              <IoSettingsOutline className="w-5 h-5" />
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
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
          <div className="flex justify-center h-full items-center">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {filteredNotifications?.length === 0 && !isLoading && (
          <div className="text-center p-4 font-bold">No notifications 🤔</div>
        )}

        {filteredNotifications?.map((notification) => {
          // Construct the base link for posts
          let postLink = "";
          if (notification.postId && notification.from?.username) {
            postLink = `/${notification.from.username}/post/${notification.postId._id}`;
          }

          // Add commentId query param if it's a comment-related notification
          if (notification.commentId) {
            // For comment, commentLike, commentReply, link to the post and add commentId as query param
            postLink += `?commentId=${
              notification.commentId._id || notification.commentId
            }`;
            // If it's a reply notification, and parentCommentId is provided, you might want to link to that instead
            // For now, linking to the actual reply comment is more direct.
          }

          return (
            <Link
              to={postLink || `/profile/${notification.from?.username}`} // Fallback to profile link
              className="border-b border-gray-700 px-3 py-4 relative flex items-start gap-2 sm:gap-4 hover:bg-gray-800 transition-colors"
              key={notification._id}
            >
              {/* Delete Single Notification Button */}
              <div className="absolute right-3 top-3" onClick={(e) => e.preventDefault()}>
                {" "}
                {/* Prevent link navigation */}
                {isDeleting ? (
                  <LoadingSpinner size="xs" />
                ) : (
                  <button
                    className="group hover:bg-red-600 duration-200 transition hover:text-red-500 hover:bg-opacity-15 rounded-full p-2"
                    onClick={() => deleteNotification(notification._id)}
                  >
                    <FiTrash
                      className="group-hover:text-red-600 transition duration-200 cursor-pointer text-gray-500"
                      size={20}
                    />
                  </button>
                )}
              </div>

              {/* Notification Type Icon */}
              <div className="flex-shrink-0 mt-1">
                {notification.type === "follow" && (
                  <FaUser className="w-7 h-7 text-primary" />
                )}
                {notification.type === "like" && (
                  <FaHeart className="w-7 h-7 text-red-500" />
                )}
                {notification.type === "commentLike" && (
                  <FaHeart className="w-7 h-7 text-pink-500" /> // Distinct color for comment likes
                )}
                {notification.type === "comment" && (
                  <FaCommentDots className="w-7 h-7 text-blue-500" />
                )}
                {notification.type === "commentReply" && (
                  <FaReply className="w-7 h-7 text-sky-500" /> // Icon for replies
                )}
                {notification.type === "repost" && (
                  <FaRetweet className="w-7 h-7 text-green-500" />
                )}
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex gap-1 items-center">
                  <Link
                    to={`/profile/${notification.from?.username}`}
                    className="avatar flex-shrink-0"
                    onClick={(e) => e.stopPropagation()} // Prevent parent link from interfering
                  >
                    <div className="w-8 rounded-full">
                      <img
                        src={notification.from?.profileImg || "/avatar-placeholder.png"}
                        alt={`${notification.from?.username}'s profile`}
                      />
                    </div>
                  </Link>
                  <Link
                    to={`/profile/${notification.from?.username}`}
                    className="font-bold truncate w-fit max-w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    @{notification.from?.username}
                  </Link>
                  <span className="text-[8px]">●</span>
                  <span className="text-gray-500 text-sm">
                    {formatPostDate(notification.createdAt)}
                  </span>
                </div>
                <span className="text-gray-300 text-sm overflow-hidden text-ellipsis whitespace-normal">
                  {notification.type === "follow" && "followed you."}
                  {notification.type === "like" && (
                    <>
                      liked your post{" "}
                      {notification.postId && (
                        <span className="text-blue-400  hover:underline">
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
                        <span className="text-blue-400  hover:underline">
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
                        <span className="text-blue-400  hover:underline">
                          `"${notification.commentId.text.substring(0, 30)}$
                          {notification.commentId.text.length > 30 ? "..." : ""}"`
                        </span>
                      )}
                      on post{" "}
                      {notification.postId && (
                        <span className="text-blue-400  hover:underline">
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
                        <span className="text-blue-400  hover:underline">
                          `"${notification.parentCommentId.text.substring(0, 30)}$
                          {notification.parentCommentId.text.length > 30 ? "..." : ""}"`
                        </span>
                      )}
                      on post{" "}
                      {notification.postId && (
                        <span className="text-blue-400  hover:underline">
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
                        <span className="text-blue-400  hover:underline">
                          {notification.postId.text
                            ? `"${notification.postId.text.substring(0, 30)}${
                                notification.postId.text.length > 30 ? "..." : ""
                              }"`
                            : "your post"}
                        </span>
                      )}
                    </>
                  )}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
};
export default NotificationPage;
