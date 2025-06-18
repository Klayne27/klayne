import { Link } from "react-router-dom";
import LoadingSpinner from "../../components/common/LoadingSpinner";

import { IoSettingsOutline } from "react-icons/io5";
import { FaUser } from "react-icons/fa";
import { FaHeart } from "react-icons/fa6";
import { FiTrash } from "react-icons/fi"; // Keep this if you use it directly
import { useFetchNotifications } from "../../hooks/notificationsHooks/useFetchNotifications";
import { useDeleteNotification } from "../../hooks/notificationsHooks/useDeleteNotification";
import { useDeleteNotifications } from "../../hooks/notificationsHooks/useDeleteNotifications";

const NotificationPage = () => {
  const { notifications, isLoading } = useFetchNotifications();
  const { deleteNotification } = useDeleteNotification();
  const { deleteNotifications, isDeleting } = useDeleteNotifications();

  return (
    <>
      {/*
        The flex-[4_4_0] class here suggests this component is part of a larger flex layout.
        To make THIS component responsive within its own boundaries, we primarily
        focus on padding and how content wraps.
        The `w-full` class ensures it takes the full width available to it.
        `max-w-screen-xl` or similar can cap its maximum width on very large screens
        to prevent content from spreading too wide, while still allowing it to shrink.
        However, the current `flex-[4_4_0]` is usually handled by the parent.
        Let's assume this component IS the primary content area.
      */}
      <div className="flex-1 border-r border-gray-700 min-h-screen w-full overflow-x-hidden md:max-w-3xl lg:max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <p className="font-bold text-xl">Notifications</p>
          <div className="dropdown dropdown-end"> {/* Use dropdown-end to ensure it opens to the left on small screens */}
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle btn-sm"> {/* Added btn classes for better clickable area */}
              <IoSettingsOutline className="w-5 h-5" /> {/* Increased icon size slightly for better tap target */}
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

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex justify-center h-full items-center">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* No Notifications Message */}
        {notifications?.length === 0 && !isLoading && ( 
          <div className="text-center p-4 font-bold">No notifications 🤔</div>
        )}

        {/* Notifications List */}
        {notifications?.map((notification) => (
          <div
            className="border-b border-gray-700 px-3 py-4 relative flex items-start gap-2 sm:gap-4" // Added flex, items-start, gap
            key={notification._id}
          >
            {/* Delete Notification Button/Spinner */}
            <div className="absolute right-3 top-3"> {/* Adjusted right/top for better spacing */}
              {isDeleting ? (
                <LoadingSpinner size="xs" />
              ) : (
                <button
                  className="hover:bg-red-600 duration-200 transition hover:text-red-500 hover:bg-opacity-15 rounded-full p-2"
                  onClick={() => deleteNotification(notification._id)}
                >
                  <FiTrash className="cursor-pointer" size={20} />
                </button>
              )}
            </div>

            {/* Notification Content */}
            <div className="flex-shrink-0"> {/* Icon container, prevent shrinking */}
              {notification.type === "follow" && (
                <FaUser className="w-7 h-7 text-primary mt-1" />
              )}
              {notification.type === "like" && (
                <FaHeart className="w-7 h-7 text-red-500 mt-1" />
              )}
            </div>

            <Link
              to={`/profile/${notification.from?.username}`}
              className="flex items-start gap-2 flex-1 min-w-0" // Use flex-1 to allow link content to take available space, min-w-0 for shrinking
            >
              <div className="avatar flex-shrink-0"> {/* Avatar, prevent shrinking */}
                <div className="w-8 rounded-full">
                  <img
                    src={notification.from?.profileImg || "/avatar-placeholder.png"}
                    alt={`${notification.from?.username}'s profile`} // Alt text for accessibility
                  />
                </div>
              </div>
              <div className="flex flex-col min-w-0"> {/* Use flex-col and min-w-0 to allow text to wrap */}
                <span className="font-bold truncate w-fit max-w-full">
                  @{notification.from?.username}
                </span>{" "}
                <span className="text-gray-400 text-sm overflow-hidden text-ellipsis"> {/* Added text-sm, overflow for longer messages */}
                  {notification.type === "follow" ? "followed you" : "liked your post"}
                </span>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </>
  );
};
export default NotificationPage;