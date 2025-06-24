import { useNavigate } from "react-router-dom"; // Link is no longer needed for the outermost wrapper
import LoadingSpinner from "../../components/common/LoadingSpinner";

import { IoSettingsOutline } from "react-icons/io5";
import { FaUser, FaHeart, FaCommentDots, FaRetweet, FaReply } from "react-icons/fa";
import { FiTrash } from "react-icons/fi";
import { useFetchNotifications } from "../../hooks/notificationsHooks/useFetchNotifications";
import { useDeleteNotification } from "../../hooks/notificationsHooks/useDeleteNotification";
import { useDeleteNotifications } from "../../hooks/notificationsHooks/useDeleteNotifications";
import { formatPostDate } from "../../utils/date";
import { useAuthUser } from "../../hooks/authHooks/useAuthUser";

const NotificationPage = () => {
  const { notifications, isLoading } = useFetchNotifications();
  const { deleteNotification, isDeleting } = useDeleteNotification();
  const { deleteNotifications } = useDeleteNotifications();
  const { authUser } = useAuthUser();
  const navigate = useNavigate();

  const filteredNotifications = notifications?.filter((notification) => {
    // Filter out self-interactions for certain notification types
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

  /**
   * Handles navigation to a user's profile page.
   * Stops event propagation to prevent triggering the parent notification item's click.
   * @param {React.MouseEvent} e - The click event.
   * @param {string} username - The username of the profile to navigate to.
   */
  const handleProfileClick = (e, username) => {
    e.stopPropagation(); // Prevent the parent div from navigating to the post
    navigate(`/profile/${username}`);
  };

  /**
   * Handles navigation for the entire notification item.
   * This function is attached to the outermost div of each notification.
   * It determines the navigation target based on the notification type.
   * @param {React.MouseEvent} e - The click event.
   * @param {object} notification - The notification object.
   */
  const handleNotificationItemClick = (e, notification) => {
    // Check if the clicked element (or any of its parents) is a button.
    // This is to ensure that clicking the delete button doesn't trigger post navigation.
    // e.target.closest() checks if the event target itself or any of its ancestors is a button.
    if (e.target.closest("button")) {
      return; // Do not navigate if a button (like the delete icon) was clicked.
    }

    // Construct the target link for the post/comment or profile.
    let targetLink = "";
    if (notification.postId && notification.postId._id) {
      // If there's a postId, navigate to the post page.
      // Ensure notification.postId.user.username is correctly populated from backend.
      targetLink = `/${notification.postId.user?.username}/post/${notification.postId._id}`;
      if (notification.commentId) {
        // If it's comment-related, add commentId as a query parameter for deep linking.
        targetLink += `?commentId=${notification.commentId._id}`;
      }
    } else {
      // Fallback: If no postId (e.g., follow notification), navigate to the 'from' user's profile.
      targetLink = `/profile/${notification.from?.username}`;
    }

    navigate(targetLink);
  };

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
                {/* Ensure deleteNotifications is properly called */}
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
          return (
            // Changed from Link to div. The navigation logic is now in handleNotificationItemClick.
            // Added cursor-pointer to indicate it's clickable.
            <div
              className="border-b border-gray-700 px-3 py-4 relative flex items-start gap-2 sm:gap-4 hover:bg-gray-800 transition-colors cursor-pointer"
              key={notification._id}
              onClick={(e) => handleNotificationItemClick(e, notification)} // Centralized navigation
            >
              {/* Delete Single Notification Button */}
              {/* This div stops propagation for its children, making sure clicks inside it are handled here */}
              <div
                className="absolute right-3 top-3"
                onClick={(e) => e.stopPropagation()}
              >
                {isDeleting ? ( // Using isDeleting from useDeleteNotifications for loading state on single delete
                  <LoadingSpinner size="xs" />
                ) : (
                  <button
                    className="group hover:bg-red-600 duration-200 transition hover:text-red-500 hover:bg-opacity-15 rounded-full p-2"
                    onClick={(e) => {
                      e.stopPropagation(); // Crucial: Prevent parent div click from navigating
                      deleteNotification(notification._id); // Call individual delete hook
                    }}
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
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex gap-1 items-center">
                  {/* Avatar - now a div with onClick handler that stops propagation */}
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
                  {/* Username - now a span with onClick handler that stops propagation */}
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
                <span className="text-gray-300 text-sm overflow-hidden text-ellipsis whitespace-normal">
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
                          `"${notification.commentId.text.substring(0, 30)}$
                          {notification.commentId.text.length > 30 ? "..." : ""}"`
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
