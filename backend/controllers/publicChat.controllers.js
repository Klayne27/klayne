import {
  activePublicChatUsers,
  emitUnreadPublicChatStatus,
  getReceiverSocketIds,
  io,
  onlineUsersMap,
  PUBLIC_CHAT_ROOM,
} from "../lib/socket.js";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/user.model.js";
import PublicChatMessage from "../models/publicMessage.model.js";

const isAdmin = async (userId) => {
  const user = await User.findById(userId).select("isAdmin");
  return user ? user.isAdmin : false;
};

const isBanned = async (userId) => {
  const user = await User.findById(userId).select("isBannedInPublicChat");
  return user ? user.isBannedInPublicChat : false;
};

export const sendPublicMessage = async (req, res) => {
  try {
    const { content, imgBase64, replyTo } = req.body;
    const senderId = req.user._id;
    let img = null;

    if (await isBanned(senderId)) {
      return res.status(403).json({ error: "You are banned from the public chat." });
    }

    if (imgBase64) {
      const uploadResponse = await cloudinary.uploader.upload(imgBase64, {
        folder: "public-chat-images",
      });
      img = uploadResponse.secure_url;
    }

    if (!content && !img) {
      return res.status(400).json({ error: "Message content or image is required." });
    }

    let newMessageData = {
      sender: senderId,
      content: content || "",
      img: img,
    };

    if (replyTo) {
      const repliedMessage = await PublicChatMessage.findById(replyTo);
      if (!repliedMessage) {
        return res.status(404).json({ error: "Message being replied to not found." });
      }
      newMessageData.replyTo = replyTo;
    }

    const newPublicMessage = new PublicChatMessage(newMessageData);
    await newPublicMessage.save();

    await newPublicMessage.populate([
      {
        path: "sender",
        select: "username fullName profileImg isAdmin isVerified isGoldVerified",
      },
      {
        path: "replyTo",
        select: "sender content img isDeletedByAdmin isDeletedByUser",
        populate: {
          path: "sender",
          select: "username isBannedInPublicChat",
        },
      },
    ]);

    io.to(PUBLIC_CHAT_ROOM).emit("newPublicMessage", newPublicMessage);

    await User.findByIdAndUpdate(senderId, {
      lastReadPublicChatTimestamp: newPublicMessage.createdAt,
    });

    const allOnlineUserIds = Array.from(onlineUsersMap.keys());

    const usersToNotify = allOnlineUserIds.filter(
      (userId) =>
        userId.toString() !== senderId.toString() && !activePublicChatUsers.has(userId)
    );

    for (const userId of usersToNotify) {
      await emitUnreadPublicChatStatus(userId);
    }

    res.status(201).json(newPublicMessage);
  } catch (error) {
    console.error("Error in sendPublicMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPublicMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 40;
    const skip = (page - 1) * limit;

    const messages = await PublicChatMessage.find()
      .sort({ createdAt: -1 }) 
      .skip(skip)
      .limit(limit)
      .populate([
        {
          path: "sender",
          select:
            "username fullName profileImg isAdmin isVerified isGoldVerified isBannedInPublicChat",
        },
        {
          path: "replyTo",
          select: "sender content img isDeletedByAdmin isDeletedByUser",
          populate: {
            path: "sender",
            select: "username isBannedInPublicChat", 
          },
        },
        {
          path: "reactions.userId",
          select: "username profileImg fullName",
        },
      ])
      .lean(); 

    res.status(200).json(messages.reverse());
  } catch (error) {
    console.error("Error in getPublicMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const adminDeletePublicMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const adminId = req.user._id;

    if (!(await isAdmin(adminId))) {
      return res
        .status(403)
        .json({ error: "Unauthorized: Only admins can delete messages." });
    }

    const message = await PublicChatMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found." });
    }
    const imageUrlToDelete = message.img;

    message.isDeletedByAdmin = true;
    message.img = null;
    await message.save();

    if (imageUrlToDelete) {
      const imgId = imageUrlToDelete.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(imgId);
    }

    io.to(PUBLIC_CHAT_ROOM).emit("publicMessageDeleted", { messageId: message._id });

    res.status(200).json({ message: "Message marked as deleted successfully." });
  } catch (error) {
    console.error("Error in adminDeletePublicMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const banUserFromPublicChat = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user._id;

    if (!(await isAdmin(adminId))) {
      return res.status(403).json({ error: "Unauthorized: Only admins can ban users." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.isAdmin) return res.status(403).json({ error: "Cannot ban another admin." });

    user.isBannedInPublicChat = true;
    await user.save();

    const bannedUserSocketIds = getReceiverSocketIds(userId);

    if (bannedUserSocketIds.length > 0) {
      bannedUserSocketIds.forEach((socketId) => {
        const socketInstance = io.sockets.sockets.get(socketId);
        if (socketInstance) {
          socketInstance.leave(PUBLIC_CHAT_ROOM);

          socketInstance.emit("bannedFromPublicChat", { isBanned: true });
        }
      });
    }

    io.to(PUBLIC_CHAT_ROOM).emit("userBanned", {
      userId: user._id,
      username: user.username,
    });

    res.status(200).json({ message: `User ${user.username} banned successfully.` });
  } catch (error) {
    console.error("Error in banUserFromPublicChat controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const unbanUserFromPublicChat = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user._id;

    if (!(await isAdmin(adminId))) {
      return res.status(403).json({ error: "Unauthorized." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    user.isBannedInPublicChat = false;
    await user.save();

    const unbannedUserSocketIds = getReceiverSocketIds(userId);

    if (unbannedUserSocketIds.length > 0) {
      unbannedUserSocketIds.forEach((socketId) => {
        const socketInstance = io.sockets.sockets.get(socketId);
        if (socketInstance) {
          socketInstance.join(PUBLIC_CHAT_ROOM);

          socketInstance.emit("bannedFromPublicChat", { isBanned: false });
        }
      });
    }

    io.to(PUBLIC_CHAT_ROOM).emit("userUnbanned", {
      userId: user._id,
      username: user.username,
    });

    res.status(200).json({ message: `User ${user.username} unbanned successfully.` });
  } catch (error) {
    console.error("Error in unbanUserFromPublicChat controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addReactionToPublicMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: No user authenticated" });
    }

    if (!messageId || !emoji) {
      return res.status(400).json({ error: "Message ID and emoji are required." });
    }

    if (await isBanned(userId)) {
      return res.status(403).json({
        error: "You are banned from the public chat and cannot react.",
      });
    }

    const message = await PublicChatMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found." });
    }

    const reactionExists = message.reactions.some(
      (reaction) =>
        reaction.userId.toString() === userId.toString() && reaction.emoji === emoji
    );

    let updatedMessage;
    if (reactionExists) {
      updatedMessage = await PublicChatMessage.findOneAndUpdate(
        { _id: messageId, "reactions.userId": userId, "reactions.emoji": emoji },
        { $pull: { reactions: { userId: userId, emoji: emoji } } },
        { new: true }
      );
    } else {
      updatedMessage = await PublicChatMessage.findOneAndUpdate(
        { _id: messageId },
        { $push: { reactions: { emoji, userId: userId } } },
        { new: true }
      );
    }

    if (!updatedMessage) {
      return res.status(404).json({ error: "Message not found or update failed." });
    }

    const populatedMessage = await PublicChatMessage.findById(updatedMessage._id)
      .populate({
        path: "sender",
        select: "username fullName profileImg isAdmin isBannedInPublicChat",
      })
      .populate({
        path: "reactions.userId", 
        select: "username profileImg fullName",
      })
      .lean();

    if (!populatedMessage) {
      console.error("Failed to populate message after update for Socket.IO emission.");
      return res
        .status(500)
        .json({ error: "Internal server error: Populated message not found." });
    }

    io.to(PUBLIC_CHAT_ROOM).emit("publicMessageReactionUpdated", {
      actorId: userId, 
      updatedMessage: populatedMessage, 
    });

    return res.status(200).json(populatedMessage);
  } catch (error) {
    console.error("Error in addReactionToPublicMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const deleteOwnPublicMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await PublicChatMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found." });
    }

    if (message.sender.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "You are not authorized to delete this message." });
    }

    const imageUrlToDelete = message.img;

    message.isDeletedByUser = true;
    message.img = null; 
    await message.save();

    if (imageUrlToDelete) {
      let imgId;
      try {
        const parts = imageUrlToDelete.split("/upload/");
        if (parts.length > 1) {
          const pathAfterUpload = parts[1]; 
          const idWithExtension = pathAfterUpload.split("/").slice(1).join("/");
          imgId = idWithExtension.split(".")[0];

          const urlSegments = imageUrlToDelete.split("/");
          const uploadIndex = urlSegments.indexOf("upload");
          if (uploadIndex !== -1 && urlSegments.length > uploadIndex + 1) {
            let startIndex = uploadIndex + 1; 
            if (
              urlSegments[startIndex].startsWith("v") &&
              urlSegments[startIndex].length === 11 &&
              !isNaN(urlSegments[startIndex].substring(1))
            ) {
              startIndex++;
            }

            imgId = urlSegments.slice(startIndex).join("/").split(".")[0];
          } else {
            console.error(
              "Cloudinary URL format unexpected. Could not extract public ID."
            );
            imgId = null;
          }
        } else {
          console.error(
            "Cloudinary URL does not contain '/upload/'. Could not extract public ID."
          );
          imgId = null;
        }

        if (!imgId) {
          console.error(
            "Cloudinary public ID is null or empty after extraction. Deletion skipped."
          );
        } else {
          const result = await cloudinary.uploader.destroy(imgId);
          if (result.result === "not found") {
            console.warn(
              `Cloudinary image with ID ${imgId} not found or already deleted.`
            );
          } else if (result.result !== "ok") {
            console.error(`Cloudinary deletion failed for ID ${imgId}:`, result.result);
          }
        }
      } catch (cloudinaryError) {
        console.error(
          "Error during Cloudinary deletion process:",
          cloudinaryError.message
        );
      }
    }

    io.to(PUBLIC_CHAT_ROOM).emit("publicOwnMessageDeleted", {
      messageId: message._id,
      senderId: message.sender.toString(),
    });

    res.status(200).json({ message: "Message deleted successfully." });
  } catch (error) {
    console.error("Error in deleteOwnPublicMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const editPublicMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { newContent } = req.body;
    const userId = req.user._id; 

    if (!newContent || newContent.trim() === "") {
      return res.status(400).json({ error: "Edited content cannot be empty." });
    }

    const message = await PublicChatMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found." });
    }

    if (message.sender.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "You are not authorized to edit this message." });
    }

    if (message.isDeletedByAdmin || message.isDeletedByUser) {
      return res.status(403).json({ error: "Cannot edit a deleted message." });
    }

    message.content = newContent;
    message.isEdited = true;
    message.editedAt = new Date();

    await message.save();

    const populatedMessage = await PublicChatMessage.findById(message._id)
      .populate([
        {
          path: "sender",
          select:
            "username fullName profileImg isAdmin isVerified isGoldVerified isBannedInPublicChat",
        },
        {
          path: "replyTo",
          select: "sender content img isDeletedByAdmin isDeletedByUser",
          populate: {
            path: "sender",
            select: "username isBannedInPublicChat",
          },
        },
        {
          path: "reactions.userId",
          select: "username profileImg fullName",
        },
      ])
      .lean();

    io.to(PUBLIC_CHAT_ROOM).emit("publicMessageEdited", populatedMessage);

    res.status(200).json(populatedMessage);
  } catch (error) {
    console.error("Error in editPublicMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
