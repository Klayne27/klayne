import { emitUnreadNotificationStatus } from "../lib/socket.js";
import Notification from "../models/notification.model.js";

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id; // This is already a mongoose.Types.ObjectId

    // 1. Fetch notifications (including any unread ones)
    const notifications = await Notification.find({ to: userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "from",
        select: "username fullName profileImg isVerified",
      });

    // 2. Send the notifications to the client FIRST
    // The client will display these notifications, and the "red dot" will still be there
    // if there were unread ones.
    res.status(200).json(notifications);

    // 3. AFTER sending the response, update their 'read' status in the database.
    // This makes the operation asynchronous from the client's perspective,
    // meaning the client gets the data without waiting for the update.
    await Notification.updateMany({ to: userId, read: false }, { read: true });

    // 4. Then, emit the new unread status to the user's connected sockets.
    // This will now correctly reflect that all notifications for this user are read.
    // This will cause the bell icon to clear its red dot on the client.
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
