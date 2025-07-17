import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import { getReceiverSocketIds, io, emitUnreadMessageStatus } from "../lib/socket.js";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/user.model.js";

const getBlockingUsers = async (userId) => {
  if (!userId) {
    return { blockedByMe: [], blockedMe: [] };
  }
  const user = await User.findById(userId).select("blockedUsers blockedBy").lean();
  return {
    blockedByMe: user.blockedUsers?.map((id) => id.toString()) || [],
    blockedMe: user.blockedBy?.map((id) => id.toString()) || [],
  };
};

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
    const {
      recipientId,
      message,
      conversationId: incomingConversationId,
      repliedTo,
      tempId,
    } = req.body;
    let { img } = req.body;
    const senderId = req.user._id;

    if (senderId.toString() === recipientId.toString()) {
      return res.status(400).json({ error: "You cannot message yourself." });
    }

    if (await isBlockedOrBlockedBy(senderId, recipientId)) {
      return res.status(403).json({
        error: "You cannot send messages to this user due to blocking restrictions.",
      });
    }

    const recipientUser = await User.findById(recipientId);
    if (!recipientUser) {
      return res.status(404).json({ error: "Recipient user not found." });
    }

    let conversation;

    if (incomingConversationId) {
      conversation = await Conversation.findById(incomingConversationId);
      if (!conversation || !conversation.participants.includes(senderId)) {
        return res
          .status(403)
          .json({ error: "Unauthorized or invalid conversation ID." });
      }
    } else {
      conversation = await Conversation.findOne({
        participants: { $all: [senderId, recipientId] },
      });

      if (!conversation) {
        conversation = new Conversation({
          participants: [senderId, recipientId],
          lastMessage: null,
          deletedFor: [],
        });
        await conversation.save();
      }
    }

    let uploadedImgUrl = "";
    if (img) {
      const uploadedResponse = await cloudinary.uploader.upload(img);
      uploadedImgUrl = uploadedResponse.secure_url;
    }

    const newMessage = new Message({
      conversationId: conversation._id,
      sender: senderId,
      text: message || "",
      img: uploadedImgUrl,
      seen: false,
      repliedTo: repliedTo || null,
      tempId,
    });

    await newMessage.save();

    conversation.lastMessage = {
      text: message || "",
      img: uploadedImgUrl,
      sender: senderId,
      seen: false,
      createdAt: newMessage.createdAt,
      isEdited: false, // <-- ADD THIS: New messages are not edited
      messageId: newMessage._id, // <-- ADD THIS: Store the actual message ID
    };

    conversation.deletedFor = conversation.deletedFor.filter(
      (entry) =>
        entry.user.toString() !== senderId.toString() &&
        entry.user.toString() !== recipientId.toString()
    );

    await conversation.save();

    await newMessage.populate("sender", "username profileImg fullName isVerified");

    if (newMessage.repliedTo) {
      await newMessage.populate({
        path: "repliedTo",
        select: "sender text img",
        populate: {
          path: "sender",
          select: "username fullName profileImg isVerified",
        },
      });
    }

    const messageToSend = { ...newMessage.toObject() };

    if (tempId) {
      messageToSend.tempId = tempId;
    }

    const recipientSocketIds = getReceiverSocketIds(recipientId.toString());
    if (recipientSocketIds.length > 0) {
      recipientSocketIds.forEach((socketId) => {
        io.to(socketId).emit("newMessage", messageToSend);
      });
    }

    // const senderSocketIds = getReceiverSocketIds(senderId.toString());
    // if (senderSocketIds.length > 0) {
    //   senderSocketIds.forEach((socketId) => {
    //     io.to(socketId).emit("newMessage", messageToSend);
    //   });
    // }

    await emitUnreadMessageStatus(recipientId.toString());
    await emitUnreadMessageStatus(senderId.toString());

    res
      .status(201)
      .json({ newMessage: newMessage.toObject(), conversationId: conversation._id });
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

    if (otherParticipantId) {
      process.nextTick(async () => {
        try {
          await Message.updateMany(
            { conversationId: conversationId, sender: otherParticipantId, seen: false },
            { $set: { seen: true } }
          );

          if (
            conversation.lastMessage &&
            conversation.lastMessage.sender.toString() ===
              otherParticipantId.toString() &&
            !conversation.lastMessage.seen
          ) {
            await Conversation.updateOne(
              { _id: conversationId },
              { $set: { "lastMessage.seen": true } },
              { timestamps: false }
            );
          }

          await emitUnreadMessageStatus(userId.toString());
          await emitUnreadMessageStatus(otherParticipantId.toString());
        } catch (error) {
          console.error("Error deferring seen status update:", error);
        }
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.find({
      conversationId: conversationId,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("sender", "username profileImg fullName isVerified")
      .populate({
        path: "repliedTo",
        select: "sender text img",
        populate: {
          path: "sender",
          select: "username fullName profileImg isVerified",
        },
      });

    res.status(200).json(messages.reverse());
  } catch (error) {
    console.error("Error in getMessagesByConversationId controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const getConversations = async (req, res) => {
  const userId = req.user._id;

  try {
    const { blockedByMe, blockedMe } = await getBlockingUsers(userId);
    const blockedAndBlockingUsers = [...new Set([...blockedByMe, ...blockedMe])];

    const conversations = await Conversation.find({
      participants: userId,
      "participants.1": { $exists: true },
      "deletedFor.user": { $ne: userId },
    })
      .populate({
        path: "participants",
        select: "username profileImg fullName isVerified",
      })
      .sort({ updatedAt: -1 });

    const processedConversations = conversations
      .map((conversation) => {
        const validParticipants = conversation.participants.filter((p) => p && p._id);

        if (validParticipants.length < 2) {
          return null;
        }

        const otherParticipant = validParticipants.find(
          (participant) => participant._id.toString() !== userId.toString()
        );

        if (!otherParticipant) {
          return null;
        }

        if (blockedAndBlockingUsers.includes(otherParticipant._id.toString())) {
          return null;
        }

        const lastMessageData = conversation.lastMessage
          ? {
              text: conversation.lastMessage.text,
              sender: conversation.lastMessage.sender,
              seen: conversation.lastMessage.seen,
              createdAt: conversation.lastMessage.createdAt,
              isEdited: conversation.lastMessage.isEdited || false, // Ensure it's always a boolean
              messageId: conversation.lastMessage.messageId || null,
              img: conversation.lastMessage.img,
            }
          : null;

        return {
          _id: conversation._id,
          participants: [otherParticipant],
          lastMessage: lastMessageData,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        };
      })
      .filter(Boolean);

    res.status(200).json(processedConversations);
  } catch (error) {
    console.error("Error in getConversations controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const getFollowedUsersForMessaging = async (req, res) => {
  try {
    const userId = req.user._id;

    const { blockedByMe, blockedMe } = await getBlockingUsers(userId);
    const blockedAndBlockingUsers = [...new Set([...blockedByMe, ...blockedMe])];

    const currentUser = await User.findById(userId).populate({
      path: "following",
      select: "username profileImg fullName isVerified",
    });

    if (!currentUser) {
      return res.status(404).json({ error: "User not found." });
    }

    const followedUsers = currentUser.following.filter((user) => {
      return user && !blockedAndBlockingUsers.includes(user._id.toString());
    });

    res.status(200).json(followedUsers);
  } catch (error) {
    console.error("Error in getFollowedUsersForMessaging controller:", error.message);
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
        await updatedConversation.save();
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

export const deleteConversationForUser = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    if (!conversation.participants.includes(userId)) {
      return res
        .status(403)
        .json({ error: "You are not a participant in this conversation" });
    }

    const otherParticipantId = conversation.participants.find(
      (p) => p.toString() !== userId.toString()
    );
    if (otherParticipantId && (await isBlockedOrBlockedBy(userId, otherParticipantId))) {
      return res.status(403).json({
        error: "You cannot delete this conversation due to blocking restrictions.",
      });
    }

    const isAlreadyDeletedForUser = conversation.deletedFor.some(
      (entry) => entry.user.toString() === userId.toString()
    );

    if (isAlreadyDeletedForUser) {
      return res
        .status(200)
        .json({ message: "Conversation already marked as deleted for this user" });
    }

    conversation.deletedFor.push({ user: userId });
    await conversation.save();

    await emitUnreadMessageStatus(userId.toString());

    res.status(200).json({ message: "Conversation deleted successfully" });
  } catch (error) {
    console.error("Error deleting conversation for user:", error.message);
    res.status(500).json({ error: "Internal server error" });
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

    if (!["❤️", "👍", "😂", "😭", "😡"].includes(emoji)) {
      return res.status(400).json({ error: "Invalid emoji provided." });
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

    const reactionIndex = message.reactions.findIndex(
      (reaction) =>
        reaction.user.toString() === userId.toString() && reaction.emoji === emoji
    );

    let action = "";

    if (reactionIndex !== -1) {
      message.reactions.splice(reactionIndex, 1);
      action = "removed";
    } else {
      message.reactions.push({ emoji, user: userId });
      action = "added";
    }

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate({
        path: "sender",
        select: "username fullName profileImg isVerified",
      })
      .populate({
        path: "repliedTo",
        select: "text img",
        populate: {
          path: "sender",
          select: "username fullName profileImg isVerified",
        },
      })
      .populate({
        path: "reactions.user",
        select: "username fullName profileImg",
      });

    const conversation = await Conversation.findById(message.conversationId);
    if (conversation) {
      conversation.participants.forEach((participantId) => {
        const receiverSocketIds = getReceiverSocketIds(participantId.toString());
        receiverSocketIds.forEach((socketId) => {
          io.to(socketId).emit("messageReacted", populatedMessage);
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

    // Store the old text before updating for comparison if needed
    const oldText = message.text;

    // Update the message document
    message.text = newText;
    message.isEdited = true; // Mark as edited
    await message.save();

    // --- CRUCIAL CHANGE: Populate message for emission ---
    // Populate sender, and if it's a reply, populate repliedTo and repliedTo.sender
    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "username fullName profileImg isVerified") // Ensure sender is populated
      .populate({
        path: "repliedTo",
        populate: {
          path: "sender",
          select: "username fullName", // Only necessary fields for repliedTo sender
        },
        select: "text img sender", // Select relevant fields for repliedTo message itself
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
        // The lastMessage in conversation also needs its repliedTo status updated
        // or re-evaluated, but it only stores text and sender for simplicity.
        // For 'repliedTo' UI in sidebar, you'd likely need to fetch the full convo.
        await conversation.save();

        // Emit conversation update for sidebar, use the fully updated conversation if possible
        const updatedConversation = await Conversation.findById(conversation._id)
          .populate("participants", "username fullName profileImg")
          .populate("lastMessage.sender", "username fullName profileImg")
          .lean(); // Fetch the latest state of the conversation

        io.to(senderId.toString()).emit("conversationUpdated", updatedConversation);
        const receiverId = conversation.participants.find(
          (pId) => pId.toString() !== senderId.toString()
        );
        const receiverSocketIds = getReceiverSocketIds(receiverId);
        if (receiverSocketIds.length > 0) {
          // Check if there are active sockets
          receiverSocketIds.forEach((socketId) => {
            io.to(socketId).emit("conversationUpdated", updatedConversation);
          });
        }
      }

      // Emit socket event to notify clients about the updated message (for the chat window itself)
      // Use the populatedMessage here!
      io.to(conversation._id.toString()).emit("messageEdited", populatedMessage); // Emit to the conversation room for all participants
      // Removed individual sender/receiver emits here, use conversation room instead for simplicity
      // and ensure all participants get it. The `io.to(conversationId)` will send to all sockets
      // that have joined that room.
    }

    res.status(200).json(populatedMessage);
  } catch (error) {
    console.error("Error in editMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
