import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import {
  getReceiverSocketIds,
  io,
  emitUnreadMessageStatus,
  userActiveChats,
} from "../lib/socket.js";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import Image from "../models/image.model.js";
import { getPublicIdFromUrl, transformCloudinaryUrl } from "../lib/utils/helpers.js";
import { sendPushNotification } from "../lib/utils/sendPush.js";

const BASE_URL = process.env.RENDER_EXTERNAL_URL;

const isBlockedOrBlockedBy = async (currentUserId, targetUserId) => {
  if (!currentUserId || !targetUserId) {
    return false;
  }
  if (currentUserId.toString() === targetUserId.toString()) {
    return false;
  }

  const currentUser = await User.findById(currentUserId)
    .select("blockedUsers blockedBy")
    .lean();
  const targetUser = await User.findById(targetUserId)
    .select("blockedUsers blockedBy")
    .lean();

  if (!currentUser || !targetUser) {
    return false;
  }

  let currentUserBlockedTarget;
  try {
    currentUserBlockedTarget = (currentUser.blockedUsers || []).some((id) => {
      const result = id.toString() === targetUserId.toString();
      return result;
    });
  } catch (e) {
    throw e;
  }

  let targetUserBlockedCurrentUser;
  try {
    targetUserBlockedCurrentUser = (targetUser.blockedUsers || []).some((id) => {
      const result = id.toString() === currentUserId.toString();
      return result;
    });
  } catch (e) {
    throw e;
  }

  return currentUserBlockedTarget || targetUserBlockedCurrentUser;
};

export const getMessagesByConversationId = async (req, res) => {
  const { conversationId } = req.params;
  const { page = 1, limit = 40 } = req.query;
  const userId = req.user._id;

  try {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found." });
    }

    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ error: "Unauthorized access to conversation." });
    }

    const otherParticipantId = conversation.participants.find(
      (participantId) => participantId.toString() !== userId.toString()
    );

    if (otherParticipantId) {
      const isBlocked = await isBlockedOrBlockedBy(userId, otherParticipantId);

      if (isBlocked) {
        return res.status(403).json({
          error: "You cannot view this conversation due to blocking restrictions.",
        });
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.find({
      conversationId: conversationId,
      deletedFor: { $nin: [userId] },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate({
        path: "sender",
        select:
          "username fullName isVerified isGoldVerified badges preferredBadge followers following createdAt",
        populate: {
          path: "profileImg coverImg",
          select: "imageUrl",
        },
      })
      .populate({
        path: "repliedTo",
        select: "sender text img voiceMessageId",
        populate: {
          path: "sender",
          select:
            "username fullName isVerified isGoldVerified badges preferredBadge followers following createdAt",
          populate: {
            path: "profileImg coverImg",
            select: "imageUrl",
          },
        },
      })
      .populate({
        path: "reactions.userId",
        select: "username fullName",
        populate: {
          path: "profileImg",
          select: "imageUrl",
        },
      })
      .populate("image", "imageUrl")
      .populate("voiceMessageId", "imageUrl")
      .lean();

    res.status(200).json(messages.reverse());
  } catch (error) {
    console.error("Error in getMessagesByConversationId controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const getConversations = async (req, res) => {
  const userId = req.user._id;

  try {
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Step 1: Get all users blocked by the current user.
    const blockedByMe = user.blockedUsers || [];

    // Step 2: Find all users who have blocked the current user.
    const usersBlockingMe = await User.find({ blockedUsers: userId })
      .select("_id")
      .lean();
    const blockedMe = usersBlockingMe.map((u) => u._id);

    // Step 3: Combine both lists into a single, comprehensive set of blocked IDs.
    const allBlockedIds = [...new Set([...blockedByMe, ...blockedMe])];

    // Step 4: Fetch conversations for the current user.
    const conversations = await Conversation.find({
      participants: userId,
      hiddenFor: { $ne: userId },
    })
      .populate({
        path: "participants",
        select:
          "username profileImg fullName isVerified isGoldVerified badges preferredBadge",
        populate: {
          path: "profileImg",
          select: "imageUrl",
        },
      })
      .populate({
        path: "pinnedMessages.pinnedBy",
        select: "username fullName",
      })
      .sort({ updatedAt: -1 })
      .lean();

    // Step 5: Filter out conversations where the other participant is in the comprehensive block list.
    const filteredConversations = conversations.filter((conv) => {
      const otherParticipant = conv.participants.find(
        (p) => p && p._id.toString() !== userId.toString()
      );
      if (!otherParticipant) return false;

      // Use the comprehensive list to check if the other participant's ID exists.
      return !allBlockedIds.some((blockedId) => blockedId.equals(otherParticipant._id));
    });

    res.status(200).json(filteredConversations);
  } catch (error) {
    console.error("Error in getConversations controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const getConversationBetweenUsers = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, otherUserId] },
    }).lean();

    if (!conversation) {
      return res
        .status(200)
        .json({ conversationId: null, isHiddenForCurrentUser: false });
    }

    const isHiddenForCurrentUser = conversation.hiddenFor.some((id) =>
      id.equals(currentUserId)
    );

    res.status(200).json({
      conversationId: conversation._id,
      isHiddenForCurrentUser: isHiddenForCurrentUser,
    });
  } catch (error) {
    console.error("Error in getConversationBetweenusers controller:", error.message);
    res.status(500).json({ error: "Internal Server Error " + error.message });
  }
};

export const getFollowedUsersForMessaging = async (req, res) => {
  try {
    const userId = req.user._id;
    const { q } = req.query;

    const currentUser = await User.findById(userId).select("following");

    if (!currentUser) {
      return res.status(404).json({ error: "Current user not found." });
    }

    const followedUserIds = currentUser.following;

    let query = {
      _id: { $in: followedUserIds },
    };

    if (q) {
      query.$or = [
        { username: { $regex: `^${q}`, $options: "i" } },
        { fullName: { $regex: `^${q}`, $options: "i" } },
      ];
    }

    const followedUsers = await User.find(query)
      .select("-password -email -blockedUsers -followers -following")
      .populate("profileImg", "imageUrl")
      .limit(10);

    res.status(200).json(followedUsers);
  } catch (error) {
    console.error("Error in getFollowedUsersForMessaging controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getOrCreateConversation = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.user._id;

    if (currentUserId.toString() === targetUserId.toString()) {
      return res.status(400).json({ error: "Cannot create conversation with yourself." });
    }

    // Find an existing conversation.
    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, targetUserId] },
    });

    // If no conversation is found, check if the users are following each other
    // and create a new conversation.
    if (!conversation) {
      const currentUser = await User.findById(currentUserId);
      if (!currentUser || !currentUser.following.includes(targetUserId)) {
        return res.status(404).json({
          error: "Conversation not found. You can only message users you follow.",
        });
      }

      // Create a new conversation since it doesn't exist and the users follow each other.
      conversation = new Conversation({
        participants: [currentUserId, targetUserId],
        messages: [],
      });
      await conversation.save();
    } else {
      // New logic: Check if the conversation was hidden for the current user.
      const isHiddenForCurrentUser = conversation.hiddenFor.includes(currentUserId);
      if (isHiddenForCurrentUser) {
        await Conversation.updateOne(
          { _id: conversation._id },
          { $pull: { hiddenFor: currentUserId } },
          { timestamps: false }
        );

        // Re-fetch the conversation to get the updated document
        conversation = await Conversation.findById(conversation._id);
      }
    }

    // If the conversation exists (or was just created), populate the participants.
    conversation = await conversation.populate({
      path: "participants",
      select: "-password -email -blockedUsers -blockedBy -following -followers",
      populate: {
        path: "profileImg",
        select: "imageUrl",
      },
    });

    return res.status(200).json(conversation);
  } catch (error) {
    console.error("Error in getOrCreateConversation controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { message, conversationId, repliedTo } = req.body;
    let { img, voiceMessage, voiceMessageDuration } = req.body;

    const senderId = req.user._id;
    const DURATION_LIMIT = 30; // 30-second limit

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID is required." });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation || !conversation.participants.includes(senderId)) {
      return res.status(403).json({ error: "Unauthorized or invalid conversation." });
    }

    // CLEAN UP CORRUPTED PINNED MESSAGES BEFORE PROCEEDING
    if (conversation.pinnedMessages && conversation.pinnedMessages.length > 0) {
      // Filter out invalid pinned messages
      const validPinnedMessages = conversation.pinnedMessages.filter((pin) => {
        return (
          pin &&
          pin.message &&
          pin.pinnedBy &&
          pin.pinnedAt &&
          // Ensure they're valid ObjectIds
          mongoose.Types.ObjectId.isValid(pin.message) &&
          mongoose.Types.ObjectId.isValid(pin.pinnedBy)
        );
      });

      // Only update if we found invalid entries
      if (validPinnedMessages.length !== conversation.pinnedMessages.length) {
        console.log(
          `Cleaned up ${
            conversation.pinnedMessages.length - validPinnedMessages.length
          } invalid pinned messages`
        );
        conversation.pinnedMessages = validPinnedMessages;
        // Save the cleanup immediately to prevent validation errors
        await conversation.save();
      }
    }

    const recipientId = conversation.participants.find((p) => !p.equals(senderId));

    const senderIsBlocked = await isBlockedOrBlockedBy(senderId, recipientId);
    if (senderIsBlocked) {
      return res.status(403).json({ error: "You cannot send messages to this user." });
    }

    if (!recipientId) {
      return res.status(404).json({ error: "Conversation recipient not found." });
    }

    if (conversation.hiddenFor && conversation.hiddenFor.length > 0) {
      conversation.hiddenFor = [];
    }

    if (voiceMessage) {
      if (!voiceMessageDuration || voiceMessageDuration > DURATION_LIMIT) {
        return res.status(400).json({
          error: `Voice message duration cannot exceed ${DURATION_LIMIT} seconds.`,
        });
      }
    }

    const recipientActiveChat = userActiveChats.get(recipientId.toString());
    const isRecipientInChat = recipientActiveChat === conversationId.toString();
    const recipientSocketIds = getReceiverSocketIds(recipientId.toString());
    const isRecipientOnline = recipientSocketIds.length > 0;

    const isSeen = isRecipientOnline && isRecipientInChat;

    let newImage = null;
    let uploadedImgUrl = "";

    let newVoiceMessage = null;
    let uploadedVoiceUrl = "";

    if (img) {
      const uploadedResponse = await cloudinary.uploader.upload(img);
      uploadedImgUrl = uploadedResponse.secure_url;
    }

    if (voiceMessage) {
      const uploadedResponse = await cloudinary.uploader.upload(voiceMessage, {
        resource_type: "video", // Cloudinary treats audio as a video resource
      });
      uploadedVoiceUrl = uploadedResponse.secure_url;
    }

    const newMessage = new Message({
      conversationId: conversation._id,
      sender: senderId,
      text: message || "",
      img: uploadedImgUrl,
      repliedTo: repliedTo || null,
      seen: isSeen,
    });

    await newMessage.save();

    if (img) {
      newImage = new Image({
        imageUrl: uploadedImgUrl,
        parentDocument: newMessage._id,
        parentModel: "Message",
        uploadedBy: senderId,
      });
      await newImage.save();

      newMessage.image = newImage._id;
      await newMessage.save();
    }

    if (voiceMessage) {
      newVoiceMessage = new Image({
        imageUrl: uploadedVoiceUrl,
        parentDocument: newMessage._id,
        parentModel: "Message",
        uploadedBy: senderId,
      });
      await newVoiceMessage.save();
      newMessage.voiceMessageDuration = voiceMessageDuration;
      newMessage.voiceMessageId = newVoiceMessage._id; // You need a new field in your Message schema for this
      await newMessage.save();
    }

    // Update the lastMessage in the conversation
    conversation.lastMessage = {
      text: newMessage.text,
      img: newMessage.img,
      sender: senderId,
      seen: isSeen,
      messageId: newMessage._id,
      audio: uploadedVoiceUrl,
    };

    // Save conversation with cleaned pinnedMessages
    await conversation.save();

    await newMessage.populate([
      {
        path: "sender",
        select: "username fullName isVerified isGoldVerified badges preferredBadge",
        populate: {
          path: "profileImg",
          select: "imageUrl",
        },
      },
      {
        path: "repliedTo",
        select: "text img sender createdAt",
        populate: {
          path: "voiceMessageId",
          select: "imageUrl",
        },
        populate: {
          path: "sender",
          select: "username",
          populate: {
            path: "profileImg",
            select: "imageUrl",
          },
        },
      },
    ]);

    if (newImage) {
      await newMessage.populate({
        path: "image",
        select: "imageUrl",
      });
    }

    if (newVoiceMessage) {
      await newMessage.populate({
        path: "voiceMessageId", // Assuming you've added this new path
        select: "imageUrl",
      });
    }

    // Emit to recipient if they're online
    if (recipientSocketIds.length > 0) {
      io.to(recipientSocketIds).emit("newMessage", newMessage.toObject());
    } else {
      // Send push notification only if recipient is offline
      const senderUser = await User.findById(senderId)
        .select("username")
        .populate("profileImg", "imageUrl")
        .lean();

      const senderUsername = senderUser ? senderUser.username : "A user";
      const resizedProfileImg = transformCloudinaryUrl(
        senderUser?.profileImg?.imageUrl,
        128,
        128
      );

      const payload = {
        title: `New Message from @${senderUsername}`,
        body: message || "Image Message",
        url: `/messages/${conversationId.toString()}`,
        icon: resizedProfileImg || `${BASE_URL}/avatar-placeholder.png`,
      };

      await sendPushNotification(recipientId.toString(), payload);
    }

    await emitUnreadMessageStatus(recipientId.toString());

    res.status(201).json(newMessage.toObject());
  } catch (error) {
    console.error("Error in sendMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const messageToDelete = await Message.findById(messageId).populate(
      "voiceMessageId",
      "imageUrl"
    );

    if (!messageToDelete) {
      return res.status(404).json({ error: "Message not found." });
    }

    if (messageToDelete.sender.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "You are not authorized to delete this message." });
    }

    const conversation = await Conversation.findById(messageToDelete.conversationId);
    if (conversation) {
      const otherParticipantId = conversation.participants.find(
        (p) => p.toString() !== userId.toString()
      );
      if (
        otherParticipantId &&
        (await isBlockedOrBlockedBy(userId, otherParticipantId))
      ) {
        return res.status(403).json({
          error:
            "You cannot delete messages in this conversation due to blocking restrictions.",
        });
      }
    }

    if (messageToDelete.img) {
      const imgId = messageToDelete.img.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(imgId);
    }

    if (messageToDelete.voiceMessageId) {
      const audioId = messageToDelete.voiceMessageId?.imageUrl
        .split("/")
        .pop()
        .split(".")[0];
      await cloudinary.uploader.destroy(audioId, { resource_type: "video" }); // Cloudinary treats audio as a 'video' resource type
    }

    await Message.findByIdAndDelete(messageId);

    const updatedConversation = await Conversation.findById(
      messageToDelete.conversationId
    );
    if (updatedConversation) {
      if (
        updatedConversation.lastMessage &&
        updatedConversation.lastMessage.text === messageToDelete.text &&
        updatedConversation.lastMessage.sender.toString() ===
          messageToDelete.sender.toString()
      ) {
        const newLastMessage = await Message.findOne({
          conversationId: updatedConversation._id,
        })
          .sort({ createdAt: -1 })
          .limit(1);

        if (newLastMessage) {
          updatedConversation.lastMessage = {
            text: newLastMessage.text,
            img: newLastMessage.img,
            sender: newLastMessage.sender,
            seen: newLastMessage.seen,
            createdAt: newLastMessage.createdAt,
          };
        } else {
          updatedConversation.lastMessage = null;
        }
        await Conversation.updateOne(
          { _id: conversation._id },
          { $set: { lastMessage: newLastMessage } },
          { timestamps: false }
        );
      }
    }

    const participants = updatedConversation ? updatedConversation.participants : [];
    for (const participantId of participants) {
      const socketIds = getReceiverSocketIds(participantId.toString());
      socketIds.forEach((socketId) => {
        io.to(socketId).emit("messageDeleted", {
          messageId,
          conversationId: messageToDelete.conversationId,
        });
      });
      await emitUnreadMessageStatus(participantId.toString());
    }

    res.status(200).json({ message: "Message deleted successfully." });
  } catch (error) {
    console.error("Error in deleteMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const reactToMessage = async (req, res) => {
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

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const messageSenderId = message.sender.toString();
    if (await isBlockedOrBlockedBy(userId, messageSenderId)) {
      return res.status(403).json({
        error: "You cannot react to this message due to blocking restrictions.",
      });
    }

    const reactionExists = message.reactions.some(
      (reaction) =>
        reaction.userId.toString() === userId.toString() && reaction.emoji === emoji // 👈 Changed from `reaction.user` to `reaction.userId`
    );

    let updatedMessage;
    if (reactionExists) {
      // 2. Change `reactions.user` in the update query
      updatedMessage = await Message.findOneAndUpdate(
        { _id: messageId, "reactions.userId": userId, "reactions.emoji": emoji }, // 👈 Changed from `reactions.user`
        { $pull: { reactions: { userId: userId, emoji: emoji } } }, // 👈 Changed from `user: userId`
        { new: true }
      );
    } else {
      // 3. Change `user` to `userId` in the push operation
      updatedMessage = await Message.findOneAndUpdate(
        { _id: messageId },
        { $push: { reactions: { emoji, userId: userId } } }, // 👈 Changed from `user: userId`
        { new: true }
      );
    }

    if (!updatedMessage) {
      return res.status(404).json({ error: "Message not found or update failed." });
    }

    const populatedMessage = await Message.findById(updatedMessage._id)
      .populate({
        path: "sender",
        select: "username fullName isVerified isGoldVerified badges preferredBadge",
        populate: {
          path: "profileImg",
          select: "imageUrl",
        },
      })
      .populate({
        path: "repliedTo",
        select: "text img",
        populate: {
          path: "sender",
          select: "username fullName isVerified isGoldVerified badges preferredBadge",
          populate: {
            path: "profileImg",
            select: "imageUrl",
          },
        },
      })
      .populate({
        path: "reactions.userId", // 👈 Change population path to `reactions.userId`
        select: "username fullName ",
        populate: {
          path: "profileImg",
          select: "imageUrl",
        },
      })
      .populate("image", "imageUrl");

    const conversation = await Conversation.findById(populatedMessage.conversationId);
    if (conversation) {
      conversation.participants.forEach((participantId) => {
        const receiverSocketIds = getReceiverSocketIds(participantId.toString());
        receiverSocketIds.forEach((socketId) => {
          io.to(socketId).emit("messageReacted", {
            actorId: userId,
            updatedMessage: populatedMessage,
          });
        });
      });
    }

    return res.status(200).json(populatedMessage);
  } catch (error) {
    console.error("Error in reactToMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { newText } = req.body;
    const senderId = req.user._id;

    if (!newText || newText.trim() === "") {
      return res.status(400).json({ error: "Message text cannot be empty" });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.sender.toString() !== senderId.toString()) {
      return res
        .status(403)
        .json({ error: "You are not authorized to edit this message" });
    }

    message.text = newText;
    message.isEdited = true;
    await message.save();

    // FIX: Add the .populate('image') call here
    const populatedMessage = await Message.findById(message._id)
      .populate({
        path: "sender",
        select: "username fullName isVerified isGoldVerified badges preferredBadge",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({
        path: "repliedTo",
        populate: {
          path: "sender",
          select: "username fullName",
        },
        select: "text img sender",
      })
      .populate({
        path: "reactions.userId",
        select: "username fullName",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({
        // This is the new part you need to add
        path: "image",
        select: "imageUrl",
      });

    const conversation = await Conversation.findById(message.conversationId);

    if (conversation) {
      if (
        conversation.lastMessage &&
        conversation.lastMessage.messageId &&
        conversation.lastMessage.messageId.toString() === message._id.toString()
      ) {
        conversation.lastMessage.text = newText;
        conversation.lastMessage.isEdited = true;

        await conversation.save();

        const updatedConversation = await Conversation.findById(conversation._id)
          .populate({
            path: "participants",
            select: "username fullName isVerified isGoldVerified badges preferredBadge",
            populate: { path: "profileImg", select: "imageUrl" },
          })
          .populate({
            path: "lastMessage.sender",
            select: "username fullName isVerified isGoldVerified badges preferredBadge",
            populate: { path: "profileImg", select: "imageUrl" },
          })
          .lean();

        io.to(senderId.toString()).emit("conversationUpdated", updatedConversation);
        const receiverId = conversation.participants.find(
          (pId) => pId.toString() !== senderId.toString()
        );
        const receiverSocketIds = getReceiverSocketIds(receiverId);
        if (receiverSocketIds.length > 0) {
          receiverSocketIds.forEach((socketId) => {
            io.to(socketId).emit("conversationUpdated", updatedConversation);
          });
        }
      }

      conversation.participants.forEach((participant) => {
        const participantIdStr = participant._id.toString();
        const participantSocketIds = getReceiverSocketIds(participantIdStr);
        if (participantSocketIds.length > 0) {
          io.to(participantSocketIds).emit("messageEdited", populatedMessage);
        }
      });
    }

    res.status(200).json(populatedMessage);
  } catch (error) {
    console.error("Error in editMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const toggleConversationVisibility = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId).lean();

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    if (!conversation.participants.some((p) => p.equals(userId))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!conversation.hiddenFor) {
      conversation.hiddenFor = [];
    }

    const isHidden = conversation.hiddenFor.some((id) => id.equals(userId));

    let updateOperation;
    if (isHidden) {
      updateOperation = { $pull: { hiddenFor: userId } };
    } else {
      updateOperation = { $addToSet: { hiddenFor: userId } };
    }

    await Conversation.updateOne({ _id: conversationId }, updateOperation, {
      timestamps: false,
    });

    res.status(200).json({
      message: isHidden
        ? "Conversation unhid successfully"
        : "Conversation hid successfully",
    });
  } catch (error) {
    console.error("Error in toggleConversationVisibility controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteConversation = async (req, res) => {
  const { id: conversationId } = req.params;
  const { _id: currentUserId } = req.user;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const conversation = await Conversation.findById(conversationId).session(session);

    if (!conversation) {
      await session.abortTransaction();
      return res.status(404).json({ error: "Conversation not found" });
    }

    if (!conversation.participants.includes(currentUserId)) {
      await session.abortTransaction();
      return res
        .status(403)
        .json({ error: "Unauthorized: You are not a participant of this conversation" });
    }

    const messagesWithImages = await Message.find({
      conversationId: conversationId,
      img: { $exists: true, $ne: "" },
    }).session(session);

    const publicIdsToDelete = messagesWithImages
      .map((message) => getPublicIdFromUrl(message.img))
      .filter(Boolean); // Filter out any null values

    if (publicIdsToDelete.length > 0) {
      // You must use a promise.all here for multiple deletions
      const deletionPromises = publicIdsToDelete.map((publicId) =>
        cloudinary.uploader.destroy(publicId)
      );
      await Promise.all(deletionPromises);
    }

    // Now, delete the associated Mongoose Image documents
    const imageIdsToDelete = messagesWithImages
      .map((message) => message.image)
      .filter(Boolean);
    if (imageIdsToDelete.length > 0) {
      await Image.deleteMany({ _id: { $in: imageIdsToDelete } }).session(session);
    }

    await Message.deleteMany({ conversationId: conversationId }).session(session);
    await Conversation.findByIdAndDelete(conversationId).session(session);

    await session.commitTransaction();
    res
      .status(200)
      .json({ message: "Conversation and all associated images deleted successfully." });
  } catch (error) {
    console.error("Error in deleteConversation:", error.message);
    await session.abortTransaction();
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    session.endSession();
  }
};

export const deleteAllMessagesOnMySide = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  try {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found." });
    }

    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ error: "Unauthorized access to conversation." });
    }

    await Message.updateMany(
      { conversationId: conversationId },
      { $addToSet: { deletedFor: userId } }
    );

    await Conversation.findByIdAndUpdate(
      conversationId,
      { $unset: { lastMessage: "" } }, // Use $unset to remove the field
      { new: true } // Return the updated document
    );

    res.status(200).json({
      message: "All messages in conversation deleted on your side successfully.",
      conversationId: conversationId,
    });
  } catch (error) {
    console.error("Error in deleteAllMessagesOnMySide controller:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const pinMessage = async (req, res) => {
  const { conversationId, messageId } = req.body;
  const userId = req.user._id;

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    if (!conversation.participants.includes(userId)) {
      return res
        .status(403)
        .json({ error: "Not authorized to pin messages in this conversation" });
    }

    const message = await Message.findOne({ _id: messageId, conversationId });
    if (!message) {
      return res.status(404).json({ error: "Message not found in this conversation" });
    }

    // Check if message is already pinned (fix the logic)
    // 👇 FIX: Filter out any corrupted entries before checking the array
    const validPinnedMessages = conversation.pinnedMessages.filter(
      (pin) => pin && pin.message
    );

    // Now, check against the clean array
    const isAlreadyPinned = validPinnedMessages.some(
      (pin) => pin.message.toString() === messageId.toString()
    );
    if (isAlreadyPinned) {
      return res.status(400).json({ error: "Message is already pinned" });
    }

    // Create the new pin information object
    const pinInfo = {
      message: messageId,
      pinnedBy: userId,
      pinnedAt: new Date(),
    };

    // Push the new object to the array
    const updatedConversation = await Conversation.findByIdAndUpdate(
      conversationId,
      { $push: { pinnedMessages: pinInfo } },
      { new: true }
    );

    const sender = await User.findById(userId).select("fullName username profileImg");

    // Socket payload with correct structure
    const socketPayload = {
      conversationId,
      message: messageId,
      pinnedBy: {
        _id: sender._id,
        fullName: sender.fullName,
        username: sender.username,
      },
      pinnedAt: pinInfo.pinnedAt.toISOString(),
    };

    io.to(conversationId).emit("pinnedMessage", socketPayload);

    res.status(200).json({
      message: "Message pinned successfully",
      pinnedMessages: updatedConversation.pinnedMessages,
    });
  } catch (error) {
    console.error("Error in pinMessage controller:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const unpinMessage = async (req, res) => {
  const { conversationId, messageId } = req.body;
  const userId = req.user._id;

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    if (!conversation.participants.includes(userId)) {
      return res
        .status(403)
        .json({ error: "Not authorized to unpin messages in this conversation" });
    }

    const validPinnedMessages = conversation.pinnedMessages.filter(
      (pin) => pin && pin.message
    );

    // Find the index in the clean array
    const pinIndex = validPinnedMessages.findIndex(
      (pin) => pin.message.toString() === messageId.toString()
    );

    if (pinIndex === -1) {
      return res.status(404).json({ error: "Message is not pinned" });
    }

    // Update the original conversation document's array
    conversation.pinnedMessages = validPinnedMessages.filter(
      (pin) => pin.message.toString() !== messageId.toString()
    );
    await conversation.save();

    const sender = await User.findById(userId).select("fullName username profileImg");

    // Emit socket event to notify other users
    const socketPayload = {
      conversationId,
      messageId,
      unpinnedBy: {
        _id: sender._id,
        fullName: sender.fullName,
        username: sender.username,
      },
      unpinnedAt: new Date().toISOString(),
    };

    io.to(conversationId).emit("unpinnedMessage", socketPayload);

    res.status(200).json({
      message: "Message unpinned successfully",
      pinnedMessages: conversation.pinnedMessages,
    });
  } catch (error) {
    console.error("Error in unpinMessage controller:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getPinnedMessages = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  try {
    const conversation = await Conversation.findById(conversationId).lean(); // Use .lean() for performance

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    if (!conversation.participants.some((p) => p.toString() === userId.toString())) {
      return res.status(403).json({ error: "Not authorized to view pinned messages" });
    }

    // This is the main change: We populate the fields inside the pinnedMessages array
    const populatedPins = await Conversation.findById(conversationId)
      .select("pinnedMessages") // We only need the pinnedMessages field
      .populate({
        path: "pinnedMessages.pinnedBy", // Populate the 'pinnedBy' user in each object
        select: "username fullName",
        populate: { path: "profileImg", select: "imageUrl" },
      })
      .populate({
        path: "pinnedMessages.message", // Populate the 'message' in each object
        select: "text sender img createdAt", // Select the fields you need from the message
        populate: {
          path: "sender", // Also populate the original sender of the message itself
          select: "username fullName",
          populate: { path: "profileImg", select: "imageUrl" },
        },
      })
      .lean();

    if (!populatedPins) {
      return res.status(200).json([]); // Return empty array if no conversation
    }

    const pinnedMessages = populatedPins?.pinnedMessages || [];

    res.status(200).json(pinnedMessages);
  } catch (error) {
    console.error("Error in getPinnedMessages controller:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
