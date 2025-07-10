import { emitUnreadNotificationStatus } from "../lib/socket.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

const getBlockingUsers = async (userId) => {
  if (!userId) {
    return { blockedByMe: [], blockedMe: [] };
  }
  const user = await User.findById(userId).select("blockedUsers blockedBy").lean();
  return {
    blockedByMe: user?.blockedUsers?.map((id) => id.toString()) || [],
    blockedMe: user?.blockedBy?.map((id) => id.toString()) || [],
  };
};

const isBlockedOrBlockedBy = async (currentUserId, targetUserId) => {
  if (!currentUserId || !targetUserId) return false;
  if (currentUserId.toString() === targetUserId.toString()) return false;

  const currentUser = await User.findById(currentUserId)
    .select("blockedUsers blockedBy")
    .lean();
  const targetUser = await User.findById(targetUserId)
    .select("blockedUsers blockedBy")
    .lean();

  if (!currentUser || !targetUser) return false;

  const currentUserBlockedTarget = currentUser.blockedUsers.some(
    (id) => id.toString() === targetUserId.toString()
  );
  const targetUserBlockedCurrentUser = targetUser.blockedUsers.some(
    (id) => id.toString() === currentUserId.toString()
  );

  return currentUserBlockedTarget || targetUserBlockedCurrentUser;
};

// export const getNotifications = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const { blockedByMe, blockedMe } = await getBlockingUsers(userId);
//     const blockedAndBlockingUsers = [...new Set([...blockedByMe, ...blockedMe])];

//     const notifications = await Notification.find({ to: userId })
//       .sort({ createdAt: -1 })
//       .populate({
//         path: "from",
//         select: "username fullName profileImg isVerified",
//       })
//       .populate({
//         path: "postId",
//         select: "text img user",
//         populate: {
//           path: "user",
//           select: "username",
//         },
//       })
//       // .populate({
//       //   path: "commentId", // If you want to show comment text for comment-related notifications
//       //   select: "text",
//       // })
//       .limit(50);

//     const filteredNotifications = notifications.filter((notification) => {
//       if (!notification.from) {
//         return false;
//       }

//       if (blockedAndBlockingUsers.includes(notification.from._id.toString())) {
//         return false;
//       }

//       if (notification.postId && !notification.postId.user) {
//         return false;
//       }

//       return true;
//     });

//     res.status(200).json(filteredNotifications);

//     await Notification.updateMany({ to: userId, read: false }, { read: true });

//     await emitUnreadNotificationStatus(userId.toString());
//   } catch (error) {
//     console.log("Error in getNotifications controller", error.message);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const { blockedByMe, blockedMe } = await getBlockingUsers(userId);
    const blockedAndBlockingUsers = [...new Set([...blockedByMe, ...blockedMe])];

    const notifications = await Notification.find({ to: userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "from",
        select: "username fullName profileImg isVerified",
      })
      .populate({
        path: "postId",
        select: "text img video mediaType", // Select fields relevant for display, include video, mediaType
        populate: {
          path: "user",
          select: "username fullName profileImg", // Populate post's author for context
        },
      })
      .populate({
        path: "commentId", // If you want to show comment text for comment-related notifications
        select: "text",
      })
      .limit(50);

    const filteredNotifications = notifications.filter((notification) => {
      // Filter out notifications from blocked users or about posts by blocked users
      if (!notification.from) {
        return false; // User might have been deleted
      }

      if (blockedAndBlockingUsers.includes(notification.from._id.toString())) {
        return false;
      }

      // If the notification is post-related (like, comment, repost, mention)
      // and the post itself or its author is blocked, filter it out.
      if (notification.postId) {
        const postAuthorId = notification.postId.user?._id?.toString();
        if (postAuthorId && blockedAndBlockingUsers.includes(postAuthorId)) {
          return false;
        }
      }

      return true;
    });

    res.status(200).json(filteredNotifications);

    // Update notifications to read after sending them
    await Notification.updateMany({ to: userId, read: false }, { read: true });

    // Assuming emitUnreadNotificationStatus is a helper that sends socket events
    await emitUnreadNotificationStatus(userId.toString());
  } catch (error) {
    console.log("Error in getNotifications controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.deleteMany({ to: userId });

    res.status(200).json({ message: "Notifications deleted successful" });

    await emitUnreadNotificationStatus(userId.toString());
  } catch (error) {
    console.log("Error in deleteNotifications controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.to.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ error: "You are not allowed to delete this notification" });
    }

    await Notification.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Notification deleted successfully" });

    await emitUnreadNotificationStatus(req.user._id.toString());
  } catch (error) {
    console.log("Error in deleteNotification controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
