import { emitUnreadNotificationStatus } from "../lib/socket.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose"; // Import mongoose for ObjectId if needed

// Helper function to get blocking relationships for the current user
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

// Helper function to check if a user is involved in a block relationship
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
        select: "text img user",
        populate: {
          path: "user",
          select: "username",
        },
      })
      .limit(50);

    const filteredNotifications = notifications.filter((notification) => {
      // First, check if 'from' user was successfully populated.
      // If notification.from is null (meaning the user doesn't exist), we should filter this notification out.
      if (!notification.from) {
        return false;
      }

      // Now that we know notification.from is not null, we can safely access its properties.
      if (blockedAndBlockingUsers.includes(notification.from._id.toString())) {
        return false;
      }

      // Additionally, consider if the postId exists or if its user exists
      // (e.g., if a post or the user who created it was deleted)
      // Depending on your requirements, you might also want to filter out notifications
      // for deleted posts or posts from deleted users.
      if (notification.postId && !notification.postId.user) {
        // If there's a postId, but the user who created that post is null
        return false;
      }

      return true;
    });

    res.status(200).json(filteredNotifications);

    // Mark all fetched notifications as read, regardless of whether they were filtered out or not.
    // This prevents the same problematic notifications from reappearing as unread.
    await Notification.updateMany({ to: userId, read: false }, { read: true });

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
