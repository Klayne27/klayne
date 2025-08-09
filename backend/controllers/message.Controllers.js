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

export const sendMessage = async (req, res) => {
  try {
    const { message, conversationId, repliedTo } = req.body;
    let { img } = req.body;
    const senderId = req.user._id;

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID is required." });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation || !conversation.participants.includes(senderId)) {
      return res.status(403).json({ error: "Unauthorized or invalid conversation." });
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

    const recipientActiveConversation = userActiveChats.get(recipientId.toString());
    const isSeen = recipientActiveConversation === conversationId.toString();

    let newImage = null;
    let uploadedImgUrl = "";
    if (img) {
      const uploadedResponse = await cloudinary.uploader.upload(img);
      uploadedImgUrl = uploadedResponse.secure_url;
    }

    // ✅ FIX 2: Use the `isSeen` variable when creating the new message
    const newMessage = new Message({
      conversationId: conversation._id,
      sender: senderId,
      text: message || "",
      img: uploadedImgUrl,
      repliedTo: repliedTo || null,
      seen: isSeen, // Correctly set `seen` status
    });

    await newMessage.save();

    if (img) {
      newImage = new Image({
        imageUrl: uploadedImgUrl,
        parentDocument: newMessage._id, // Set the parentDocument here
        parentModel: "Message",
        uploadedBy: senderId,
      });
      await newImage.save();

      newMessage.image = newImage._id;
      await newMessage.save();
    }

    // ✅ FIX 3: Use the `isSeen` variable when updating the lastMessage
    conversation.lastMessage = {
      text: newMessage.text,
      img: newMessage.img,
      sender: senderId,
      seen: isSeen, // Correctly set `seen` status
      messageId: newMessage._id,
    };
    await conversation.save();

    // newImage.parentDocument = newMessage._id;
    // await newImage.save();
    await newMessage.populate([
      {
        path: "sender",
        select: "username fullName isVerified isGoldVerified",
        populate: {
          path: "profileImg",
          select: "imageUrl",
        },
      },
      {
        path: "repliedTo",
        select: "text img sender createdAt",
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

    // Then, if a new image exists, populate the image field
    if (newImage) {
      await newMessage.populate({
        path: "image",
        select: "imageUrl", // Select only the fields you need
      });
    }

    if (newMessage.repliedTo) {
      await newMessage.populate({
        path: "repliedTo",
        select: "text img sender createdAt",
        populate: {
          path: "sender",
          select: "username",
          populate: {
            path: "profileImg",
            select: "imageUrl",
          },
        },
      });
    }

    const recipientSocketIds = getReceiverSocketIds(recipientId.toString());
    if (recipientSocketIds.length > 0) {
      io.to(recipientSocketIds).emit("newMessage", newMessage.toObject());
    }

    if (isSeen) {
      const senderSocketIds = getReceiverSocketIds(senderId.toString());
      io.to(senderSocketIds).emit("messagesSeen", {
        conversationId: conversationId,
        readerId: recipientId,
      });
    }

    await emitUnreadMessageStatus(recipientId.toString());
    await emitUnreadMessageStatus(senderId.toString());

    res.status(201).json(newMessage.toObject());
  } catch (error) {
    console.error("Error in sendMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
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
        select: "username fullName isVerified isGoldVerified",
        populate: {
          path: "profileImg",
          select: "imageUrl",
        },
      })
      .populate({
        path: "repliedTo",
        select: "sender text img",
        populate: {
          path: "sender",
          select: "username fullName isVerified isGoldVerified",
          populate: {
            path: "profileImg",
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
    const user = await User.findById(userId);
    const blockedByMe = user.blockedUsers || [];

    const usersBlockingMe = await User.find({ blockedUsers: userId }).select("_id");
    const blockedMe = usersBlockingMe.map((u) => u._id);

    const allBlockedIds = [...new Set([...blockedByMe, ...blockedMe])];

    const conversations = await Conversation.find({
      participants: userId,
      hiddenFor: { $ne: userId },
    })
      .populate({
        path: "participants",
        select: "username  fullName isVerified isGoldVerified",
        populate: {
          path: "profileImg",
          select: "imageUrl",
        },
      })
      .sort({ updatedAt: -1 })
      .lean();

    const filteredConversations = conversations.filter((conv) => {
      const otherParticipant = conv.participants.find(
        (p) => p._id.toString() !== userId.toString()
      );
      if (!otherParticipant) return false;
      return !allBlockedIds.some((blockedId) => blockedId.equals(otherParticipant._id));
    });

    res.status(200).json(filteredConversations);
  } catch (error) {
    console.error("Error in getConversations controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const messageToDelete = await Message.findById(messageId);

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
        select: "username fullName isVerified isGoldVerified",
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
          select: "username fullName isVerified isGoldVerified",
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
      }).populate("image", "imageUrl")

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

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "username fullName profileImg isVerified isGoldVerified")
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
        select: "username profileImg fullName",
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
          .populate(
            "participants",
            "username fullName profileImg isVerified isGoldVerified"
          )
          .populate(
            "lastMessage.sender",
            "username fullName profileImg isVerified isGoldVerified"
          )
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

export const deleteConversation = async (req, res) => {
  const { id: conversationId } = req.params;
  const { _id: currentUserId } = req.user;

  // Use a transaction to ensure all operations succeed or fail together.
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

    const otherUserId = conversation.participants.find(
      (p) => p && !p.equals(currentUserId)
    );

    if (!otherUserId) {
      await session.abortTransaction();
      return res.status(500).json({ error: "Could not identify the other participant" });
    }

    // Unfollow logic is no longer required as per your new requirement.
    // However, if you still want to manage follow/unfollow status,
    // this is where you would do it.
    // The previous code had this logic here.

    // Delete all messages associated with the conversation.
    await Message.deleteMany({ conversationId: conversationId }).session(session);

    // Delete the conversation document itself.
    await Conversation.findByIdAndDelete(conversationId).session(session);

    await session.commitTransaction();
    res.status(200).json({ message: "Conversation deleted successfully." });
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

    res.status(200).json({
      message: "All messages in conversation deleted on your side successfully.",
      conversationId: conversationId,
    });
  } catch (error) {
    console.error("Error in deleteAllMessagesOnMySide controller:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
