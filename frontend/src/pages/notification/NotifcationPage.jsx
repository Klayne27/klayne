import { Link } from "react-router-dom";
import LoadingSpinner from "../../components/common/LoadingSpinner";

import { IoSettingsOutline } from "react-icons/io5";
import { FaTrash, FaUser } from "react-icons/fa";
import { FaHeart } from "react-icons/fa6";
import { useFetchNotifications } from "../../hooks/notificationsHooks/useFetchNotifications";
import { useDeleteNotification } from "../../hooks/notificationsHooks/useDeleteNotification";
import { useDeleteNotifications } from "../../hooks/notificationsHooks/useDeleteNotifications";

const NotificationPage = () => {
  const { notifications, isLoading } = useFetchNotifications();

  const { deleteNotification } = useDeleteNotification();
  const { deleteNotifications, isDeleting } = useDeleteNotifications();

  const handleDeleteNotification = (notificationId) => {
    deleteNotification(notificationId);
  };

  console.log(notifications);

  return (
    <>
      <div className="flex-[4_4_0]  border-r border-gray-700 min-h-screen">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <p className="font-bold">Notifications</p>
          <div className="dropdown ">
            <div tabIndex={0} role="button" className="m-1">
              <IoSettingsOutline className="w-4" />
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
            >
              <li>
                <a onClick={deleteNotifications}>Delete all notifications</a>
              </li>
            </ul>
          </div>
        </div>
        {isLoading && (
          <div className="flex justify-center h-full items-center">
            <LoadingSpinner size="lg" />
          </div>
        )}
        {notifications?.length === 0 && (
          <div className="text-center p-4 font-bold">No notifications 🤔</div>
        )}
        {notifications?.map((notification) => (
          <div className="border-b border-gray-700 relative" key={notification._id}>
            {isDeleting ? (
              <div className="absolute right-4 top-4">
                <LoadingSpinner size="xs" />
              </div>
            ) : (
              <button
                className=" absolute right-5 top-5"
                onClick={() => handleDeleteNotification(notification._id)}
              >
                <FaTrash className="cursor-pointer hover:text-red-500" />
              </button>
            )}
            <div className="flex gap-2 p-4">
              {notification.type === "follow" && (
                <FaUser className="w-7 h-7 text-primary" />
              )}
              {notification.type === "like" && (
                <FaHeart className="w-7 h-7 text-red-500" />
              )}
              <Link to={`/profile/${notification.from.username}`}>
                <div className="avatar">
                  <div className="w-8 rounded-full">
                    <img
                      src={notification.from.profileImg || "/avatar-placeholder.png"}
                    />
                  </div>
                </div>
                <div className="flex gap-1">
                  <span className="font-bold">@{notification.from.username}</span>{" "}
                  {notification.type === "follow" ? "followed you" : "liked your post"}
                </div>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
export default NotificationPage;
