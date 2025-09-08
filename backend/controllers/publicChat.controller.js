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
import Image from "../models/image.model.js";

const isAdmin = async (userId) => {
  const user = await User.findById(userId).select("isAdmin");
  return user ? user.isAdmin : false;
};

const isBanned = async (userId) => {
  const user = await User.findById(userId).select("isBannedInPublicChat");
  return user ? user.isBannedInPublicChat : false;
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
            "username fullName  isAdmin isVerified isGoldVerified badges preferredBadge isBannedInPublicChat",
          populate: {
            path: "profileImg coverImg",
            select: "imageUrl publicId",
          },
        },
        {
          path: "repliedTo",
          select: "sender text img isDeletedByAdmin isDeletedByUser",
          populate: {
            path: "sender",
            select: "username isBannedInPublicChat",
          },
        },
        {
          path: "reactions.userId",
          select: "username fullName",
          populate: {
            path: "profileImg coverImg",
            select: "imageUrl publicId",
          },
        },
        {
          path: "image",
          select: "imageUrl publicId",
        },
        {
          path: "voiceMessageId",
          select: "imageUrl",
        },
      ])
      .lean();

    res.status(200).json(messages.reverse());
  } catch (error) {
    console.error("Error in getPublicMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendPublicMessage = async (req, res) => {
  try {
    const { text, imgBase64, repliedTo, voiceMessageBase64, voiceMessageDuration } =
      req.body; // 👈 Add voiceMessageBase64
    const senderId = req.user._id;
    let img = null;
    let newImage = null;
    let newVoiceMessage = null; // 👈 New variable for the voice message Image document

    const DURATION_LIMIT = 30;

    if (await isBanned(senderId)) {
      return res.status(403).json({ error: "You are banned from the public chat." });
    }

    if (voiceMessageBase64) {
      if (!voiceMessageDuration || voiceMessageDuration > DURATION_LIMIT) {
        return res.status(400).json({
          error: `Voice message duration cannot exceed ${DURATION_LIMIT} seconds.`,
        });
      }
    }

    if (imgBase64) {
      const uploadResponse = await cloudinary.uploader.upload(imgBase64, {
        folder: "public-chat-images",
      });
      img = uploadResponse.secure_url;

      newImage = new Image({
        imageUrl: img,
        parentDocument: null, // Will be set after the message is created
        parentModel: "PublicChatMessage",
        uploadedBy: senderId,
        publicId: uploadResponse.public_id,
      });
      await newImage.save();
    }

    // 👈 Add voice message handling logic
    if (voiceMessageBase64) {
      const uploadResponse = await cloudinary.uploader.upload(voiceMessageBase64, {
        resource_type: "video", // Cloudinary treats audio files as video resources
      });

      newVoiceMessage = new Image({
        imageUrl: uploadResponse.secure_url,
        parentDocument: null,
        parentModel: "PublicChatMessage",
        uploadedBy: senderId,
        publicId: uploadResponse.public_id,
      });
      await newVoiceMessage.save();
    }

    if (!text && !imgBase64 && !voiceMessageBase64) {
      return res
        .status(400)
        .json({ error: "Message text, image, or voice message is required." });
    }
    let newMessageData = {
      sender: senderId,
      text: text || "",
      img: img,
    };

    if (repliedTo) {
      const repliedMessage = await PublicChatMessage.findById(repliedTo);
      if (!repliedMessage) {
        return res.status(404).json({ error: "Message being replied to not found." });
      }
      newMessageData.repliedTo = repliedTo;
    }

    const newPublicMessage = new PublicChatMessage(newMessageData);

    // ✅ FIX 2: Link the Image document to the message
    if (newImage) {
      newPublicMessage.image = newImage._id;
      newImage.parentDocument = newPublicMessage._id;
      await newImage.save();
    }

    if (newVoiceMessage) {
      newPublicMessage.voiceMessageId = newVoiceMessage._id;
      newPublicMessage.voiceMessageDuration = voiceMessageDuration
      newVoiceMessage.parentDocument = newPublicMessage._id;
      await newVoiceMessage.save();
    }

    await newPublicMessage.save();

    await newPublicMessage.populate([
      {
        path: "sender",
        select:
          "username fullName isAdmin isVerified isGoldVerified badges preferredBadge",
        populate: {
          path: "profileImg coverImg",
          select: "imageUrl publicId",
        },
      },
      {
        path: "repliedTo",
        select: "sender text img isDeletedByAdmin isDeletedByUser",
        populate: {
          path: "sender",
          select: "username isBannedInPublicChat",
        },
      },
      {
        path: "image",
        select: "imageUrl publicId",
      },
      {
        path: "voiceMessageId",
        select: "imageUrl publicId",
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

export const adminDeletePublicMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const adminId = req.user._id;

    if (!(await isAdmin(adminId))) {
      return res
        .status(403)
        .json({ error: "Unauthorized: Only admins can delete messages." });
    }

    const message = await PublicChatMessage.findById(messageId).populate(
      "voiceMessageId",
      "imageUrl"
    );

    if (!message) {
      return res.status(404).json({ error: "Message not found." });
    }
    const imageUrlToDelete = message.img;
    const audioUrlToDelete = message.voiceMessageId.imageUrl;

    message.isDeletedByAdmin = true;
    message.img = null;
    await message.save();

    if (imageUrlToDelete) {
      const imgId = imageUrlToDelete.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(imgId);
    }

    if (audioUrlToDelete) {
      const audioId = audioUrlToDelete.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(audioId, { resource_type: "video" });
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
        select: "username fullName  isAdmin isBannedInPublicChat",
        populate: {
          path: "profileImg",
          select: "imageUrl publicId",
        },
      })
      .populate({
        path: "reactions.userId",
        select: "username  fullName",
        populate: {
          path: "profileImg",
          select: "imageUrl publicId",
        },
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

    const message = await PublicChatMessage.findById(messageId).populate(
      "voiceMessageId",
      "imageUrl"
    );
    // const message = await PublicChatMessage.findByIdAndDelete(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found." });
    }

    if (message.sender.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "You are not authorized to delete this message." });
    }

    const imageUrlToDelete = message.img;
    const audioUrlToDelete = message.voiceMessageId.imageUrl;

    message.isDeletedByUser = true;
    message.img = null;
    await message.save();

    // if (imageUrlToDelete) {
    //   let imgId;
    //   try {
    //     const parts = imageUrlToDelete.split("/upload/");
    //     if (parts.length > 1) {
    //       const pathAfterUpload = parts[1];
    //       const idWithExtension = pathAfterUpload.split("/").slice(1).join("/");
    //       imgId = idWithExtension.split(".")[0];

    //       const urlSegments = imageUrlToDelete.split("/");
    //       const uploadIndex = urlSegments.indexOf("upload");
    //       if (uploadIndex !== -1 && urlSegments.length > uploadIndex + 1) {
    //         let startIndex = uploadIndex + 1;
    //         if (
    //           urlSegments[startIndex].startsWith("v") &&
    //           urlSegments[startIndex].length === 11 &&
    //           !isNaN(urlSegments[startIndex].substring(1))
    //         ) {
    //           startIndex++;
    //         }

    //         imgId = urlSegments.slice(startIndex).join("/").split(".")[0];
    //       } else {
    //         console.error(
    //           "Cloudinary URL format unexpected. Could not extract public ID."
    //         );
    //         imgId = null;
    //       }
    //     } else {
    //       console.error(
    //         "Cloudinary URL does not contain '/upload/'. Could not extract public ID."
    //       );
    //       imgId = null;
    //     }

    //     if (!imgId) {
    //       console.error(
    //         "Cloudinary public ID is null or empty after extraction. Deletion skipped."
    //       );
    //     } else {
    //       const result = await cloudinary.uploader.destroy(imgId);
    //       if (result.result === "not found") {
    //         console.warn(
    //           `Cloudinary image with ID ${imgId} not found or already deleted.`
    //         );
    //       } else if (result.result !== "ok") {
    //         console.error(`Cloudinary deletion failed for ID ${imgId}:`, result.result);
    //       }
    //     }
    //   } catch (cloudinaryError) {
    //     console.error(
    //       "Error during Cloudinary deletion process:",
    //       cloudinaryError.message
    //     );
    //   }
    // }

    if (imageUrlToDelete) {
      const imgId = imageUrlToDelete.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(imgId);
    }

    if (audioUrlToDelete) {
      const audioId = audioUrlToDelete.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(audioId, { resource_type: "video" }); // Cloudinary treats audio as a 'video' resource type
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
    const { newText } = req.body;
    const userId = req.user._id;

    if (!newText || newText.trim() === "") {
      return res.status(400).json({ error: "Edited text cannot be empty." });
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

    message.text = newText;
    message.isEdited = true;
    message.editedAt = new Date();

    await message.save();

    const populatedMessage = await PublicChatMessage.findById(message._id)
      .populate([
        {
          path: "sender",
          select:
            "username fullName isAdmin isVerified badges preferredBadge isGoldVerified isBannedInPublicChat",
          populate: {
            path: "profileImg coverImg",
            select: "imageUrl publicId",
          },
        },
        {
          path: "repliedTo",
          select: "sender text img isDeletedByAdmin isDeletedByUser",
          populate: {
            path: "sender",
            select: "username isBannedInPublicChat",
          },
        },
        {
          path: "reactions.userId",
          select: "username fullName",
          populate: {
            path: "profileImg coverImg",
            select: "imageUrl publicId",
          },
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
