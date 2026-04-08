import { emitUnreadNotificationStatus } from "../lib/socket.js";
import { getBlockingUsers } from "../lib/utils/helpers.js";
import Notification from "../models/notification.model.js";

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const { blockedByMe, blockedMe } = await getBlockingUsers(userId);
    const blockedAndBlockingUsers = [...new Set([...blockedByMe, ...blockedMe])];

    const notifications = await Notification.find({ to: userId })
      .select("-__v -updatedAt")
      .sort({ createdAt: -1 })
      .populate({
        path: "from",
        select: "username fullName isVerified isGoldVerified  badges preferredBadge",
        populate: {
          path: "profileImg",
          select: "imageUrl",
        },
      })
      .populate({
        path: "postId",
        select: "text img video mediaType user isVent isIC isAnonymous parentPost",
        populate: [
          {
            path: "user",
            select: "username fullName",
            populate: { path: "profileImg", select: "imageUrl" },
          },
          {
            path: "parentPost",
            select: "text user",
            populate: {
              path: "user",
              select: "username fullName",
            },
          },
        ],
      })
      .populate({
        path: "boardPostId",
        select: "title user img",
        populate: { path: "user", select: "username fullName" },
      })
      .populate({
        path: "boardCommentId",
        select: "content user img",
        populate: { path: "user", select: "username" },
      })
      .limit(50);

    const filteredNotifications = notifications.filter((notification) => {
      if (!notification.from) {
        return false;
      }

      if (blockedAndBlockingUsers.includes(notification.from._id.toString())) {
        return false;
      }

      if (notification.postId) {
        const postAuthorId = notification.postId.user?._id?.toString();
        if (postAuthorId && blockedAndBlockingUsers.includes(postAuthorId)) {
          return false;
        }
      }

      return true;
    });
    const notificationsWithAnonymity = filteredNotifications.map((notif) => {
      const populatedNotif = notif.toObject();

      const isPostOwner =
        populatedNotif.from?._id?.toString() ===
        populatedNotif.postId?.user?._id?.toString();

      if (isPostOwner && populatedNotif.postId.isAnonymous) {
        if (populatedNotif.from) {
          populatedNotif.from.username = "Anonymous";
          populatedNotif.from.fullName = "Anonymous";
          populatedNotif.from.isGoldVerified = false;
          if (populatedNotif.from.profileImg) {
            populatedNotif.from.profileImg.imageUrl = "/avatar-placeholder.png";
          } else {
            populatedNotif.from.profileImg = {
              imageUrl: "/avatar-placeholder.png",
            };
          }
        }
      }
      return populatedNotif;
    });

    res.status(200).json(notificationsWithAnonymity);

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
