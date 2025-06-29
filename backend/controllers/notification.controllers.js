import { emitUnreadNotificationStatus } from "../lib/socket.js";
import Notification from "../models/notification.model.js";

// Helper function to get blocking relationships for the current user
// (Re-added here for completeness, ideally would be in a shared utils file)
const getBlockingUsers = async (userId) => {
  if (!userId) {
    return { blockedByMe: [], blockedMe: [] };
  }
  const user = await User.findById(userId).select("blockedUsers blockedBy").lean();
  return {
    blockedByMe: user ? user.blockedUsers.map(id => id.toString()) : [],
    blockedMe: user ? user.blockedBy.map(id => id.toString()) : [],
  };
};

// Helper function to check if a user is involved in a block relationship
// (Re-added here for completeness, ideally would be in a shared utils file)
const isBlockedOrBlockedBy = async (currentUserId, targetUserId) => {
  if (!currentUserId || !targetUserId) return false;
  if (currentUserId.toString() === targetUserId.toString()) return false;

  const currentUser = await User.findById(currentUserId).select("blockedUsers blockedBy").lean();
  const targetUser = await User.findById(targetUserId).select("blockedUsers blockedBy").lean();

  if (!currentUser || !targetUser) return false;

  // Current user has blocked target user OR target user has blocked current user
  const currentUserBlockedTarget = currentUser.blockedUsers.some(id => id.toString() === targetUserId.toString());
  const targetUserBlockedCurrentUser = targetUser.blockedUsers.some(id => id.toString() === currentUserId.toString());

  return currentUserBlockedTarget || targetUserBlockedCurrentUser;
};

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    // --- START: Fetch blocking relationships for the current user ---
    const { blockedByMe, blockedMe } = await getBlockingUsers(userId);
    const blockedAndBlockingUsers = [...new Set([...blockedByMe, ...blockedMe])];
    // --- END: Fetch blocking relationships ---

    const notifications = await Notification.find({ to: userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "from",
        select: "username fullName profileImg isVerified", // We will manually filter, so no need for blockedUsers here
      })
      .populate({
        path: "postId",
        select: "text img user",
        populate: {
          path: "user",
          select: "username",
        },
      })
      .limit(50); // Limit applies before filtering

    // --- START: Filter notifications based on blocking relationships ---
    const filteredNotifications = notifications.filter((notification) => {
      // If the 'from' user (initiator of the action) is blocked by the 'to' user (recipient)
      // or if the 'from' user has blocked the 'to' user, hide the notification.
      if (blockedAndBlockingUsers.includes(notification.from._id.toString())) {
        return false;
      }
      return true;
    });
    // --- END: Filter notifications based on blocking relationships ---

    res.status(200).json(filteredNotifications); // Send the filtered list

    // Mark as read AFTER sending response, and only for the ones that were visible
    // This part requires careful consideration: Do we mark ALL fetched (including filtered out) as read,
    // or only the ones shown? For simplicity and to prevent repeat notifications,
    // we generally mark all as read. If only visible ones should be marked,
    // you'd need to modify `updateMany` query or update in a loop.
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
