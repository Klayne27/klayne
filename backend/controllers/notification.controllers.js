import Notification from "../models/notification.models.js";

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const notifications = await Notification.find({ to: userId }).populate({
      path: "from",
      select: "username profileImg",
    });

    await Notification.updateMany({ to: userId }, { read: true });

    res.status(200).json(notifications);
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
  } catch (error) {
    console.log("Error in deleteNotifications controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// export const deleteNotification = async (req, res) => {
//   try {
//     const notificationId = req.params._id;
//     const userId = req.user._id;

//     const notification = await Notification.findById(notificationId);

//     if (!notification) {
//       return res.status(404).json({ error: "Notification not found" });
//     }

//     if (notification.toString() !== userId.toString()) {
//       return res
//         .status(403)
//         .json({ error: "You are not allowed to delete this notification" });
//     }

//     await Notification.findByIdAndDelete(notificationId);

//     res.status(200).json({ message: "Notification deleted successfully" });
//   } catch (error) {
//     console.log("Error in deleteNotification controller", error.message);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };
