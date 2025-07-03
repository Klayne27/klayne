import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import { getReceiverSocketIds, io, emitUnreadMessageStatus } from "../lib/socket.js";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/user.model.js";

// Re-using helper functions for blocking status
// Helper function to get blocking relationships for the current user
const getBlockingUsers = async (userId) => {
  if (!userId) {
    return { blockedByMe: [], blockedMe: [] };
  }
  const user = await User.findById(userId).select("blockedUsers blockedBy").lean();
  return {
    // Safely access blockedUsers and blockedBy, defaulting to empty arrays if undefined/null
    blockedByMe: user.blockedUsers?.map((id) => id.toString()) || [],
    blockedMe: user.blockedBy?.map((id) => id.toString()) || [],
  };
};

// Helper function to check if a user is involved in a block relationship
// targetUserId is the user whose content or profile we are interacting with
// currentUserId is the authenticated user
// Make sure this is the DEFINITIVE isBlockedOrBlockedBy function that your controllers are using
const isBlockedOrBlockedBy = async (currentUserId, targetUserId) => {

  if (!currentUserId || !targetUserId) {
      return false;
  }
  if (currentUserId.toString() === targetUserId.toString()) {
      return false;
  }

  const currentUser = await User.findById(currentUserId).select("blockedUsers blockedBy").lean();
  const targetUser = await User.findById(targetUserId).select("blockedUsers blockedBy").lean();



  if (!currentUser || !targetUser) {
      return false;
  }

  // !! THIS IS THE CRITICAL SECTION !!
  let currentUserBlockedTarget;
  try {
      currentUserBlockedTarget = (currentUser.blockedUsers || []).some(id => {
          const result = id.toString() === targetUserId.toString();
          return result;
      });
  } catch (e) {
      throw e; // Re-throw to see the original stack trace if needed
  }

  let targetUserBlockedCurrentUser;
  try {
      targetUserBlockedCurrentUser = (targetUser.blockedUsers || []).some(id => {
          const result = id.toString() === currentUserId.toString();
          return result;
      });
  } catch (e) {
      throw e; // Re-throw to see the original stack trace if needed
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

    // --- START: BLOCKING CHECK FOR SENDING MESSAGE ---
    if (await isBlockedOrBlockedBy(senderId, recipientId)) {
      return res.status(403).json({
        error: "You cannot send messages to this user due to blocking restrictions.",
      });
    }
    // --- END: BLOCKING CHECK FOR SENDING MESSAGE ---

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
          deletedFor: [], // Initialize deletedFor for new conversations
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
    };

    //// this was 'conversaion.deletedFor' before

    // When a new message is sent, ensure conversation is visible to both parties
    // i.e., clear any 'deletedFor' entries for the participants of this conversation
    conversation.deletedFor = conversation.deletedFor.filter(
      (entry) =>
        entry.user.toString() !== senderId.toString() &&
        entry.user.toString() !== recipientId.toString()
    );

    await conversation.save();

    // Corrected select for sender
    await newMessage.populate("sender", "username profileImg fullName isVerified");

    if (newMessage.repliedTo) {
      // Corrected select for repliedTo.sender
      await newMessage.populate({
        path: "repliedTo",
        select: "sender text img",
        populate: {
          path: "sender",
          select: "username fullName profileImg isVerified", // Corrected: Specific inclusions only
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
  const { page = 1, limit = 20 } = req.query;
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

    // --- START: BLOCKING CHECK FOR GETTING MESSAGES ---
    // Crucial: Only call isBlockedOrBlockedBy if otherParticipantId is found
    if (otherParticipantId) {
      // Check if otherParticipantId exists BEFORE passing to blocking check
      const isBlocked = await isBlockedOrBlockedBy(userId, otherParticipantId);

      if (isBlocked) {
        return res.status(403).json({
          error: "You cannot view this conversation due to blocking restrictions.",
        });
      }
    } else {

      // Depending on your application logic, you might want to return an error here
      // if a conversation *must* have two distinct participants.
      // For now, let's allow it to proceed to fetch messages if blocking check is skipped.
    }

    if (otherParticipantId) {
      // Defer marking messages as seen and emitting unread status
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

          // Emit status updates after DB writes are complete
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
    // --- START: BLOCKING FILTERING FOR GETTING CONVERSATIONS ---
    const { blockedByMe, blockedMe } = await getBlockingUsers(userId);
    const blockedAndBlockingUsers = [...new Set([...blockedByMe, ...blockedMe])];
    // --- END: BLOCKING FILTERING FOR GETTING CONVERSATIONS ---

    const conversations = await Conversation.find({
      participants: userId,
      "participants.1": { $exists: true },
      "deletedFor.user": { $ne: userId },
    })
      .populate({
        path: "participants",
        select: "username profileImg fullName isVerified", // Corrected: Only specify inclusions
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

        // --- APPLY BLOCKING FILTERING HERE ---
        // If the other participant is in the blocked/blocking list, filter out this conversation
        if (blockedAndBlockingUsers.includes(otherParticipant._id.toString())) {
          return null;
        }
        // --- END: APPLY BLOCKING FILTERING ---

        const lastMessageData = conversation.lastMessage
          ? {
              text: conversation.lastMessage.text,
              sender: conversation.lastMessage.sender,
              seen: conversation.lastMessage.seen,
              createdAt: conversation.lastMessage.createdAt,
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

    // --- START: BLOCKING FILTERING FOR FOLLOWED USERS FOR MESSAGING ---
    const { blockedByMe, blockedMe } = await getBlockingUsers(userId);
    const blockedAndBlockingUsers = [...new Set([...blockedByMe, ...blockedMe])];
    // --- END: BLOCKING FILTERING FOR FOLLOWED USERS FOR MESSAGING ---

    const currentUser = await User.findById(userId).populate({
      path: "following",
      select: "username profileImg fullName isVerified", // Corrected: Only specify inclusions
    });

    if (!currentUser) {
      return res.status(404).json({ error: "User not found." });
    }

    const followedUsers = currentUser.following.filter((user) => {
      // Filter out users who are null or are involved in a blocking relationship
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

    // --- START: BLOCKING CHECK FOR DELETING MESSAGE ---
    // Although the sender is deleting their own message, if the other participant is blocked,
    // we should prevent unintended side effects or information leakage.
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
    // --- END: BLOCKING CHECK FOR DELETING MESSAGE ---

    if (messageToDelete.img) {
      const imgId = messageToDelete.img.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(imgId);
    }

    await Message.findByIdAndDelete(messageId);

    // Re-fetch conversation as it might have been modified by the blocking check
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

    // --- START: BLOCKING CHECK FOR DELETING CONVERSATION ---
    const otherParticipantId = conversation.participants.find(
      (p) => p.toString() !== userId.toString()
    );
    if (otherParticipantId && (await isBlockedOrBlockedBy(userId, otherParticipantId))) {
      return res.status(403).json({
        error: "You cannot delete this conversation due to blocking restrictions.",
      });
    }
    // --- END: BLOCKING CHECK FOR DELETING CONVERSATION ---

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

    // --- START: BLOCKING CHECK FOR REACTING TO MESSAGE ---
    const messageSenderId = message.sender.toString();
    if (await isBlockedOrBlockedBy(userId, messageSenderId)) {
      return res.status(403).json({
        error: "You cannot react to this message due to blocking restrictions.",
      });
    }
    // --- END: BLOCKING CHECK FOR REACTING TO MESSAGE ---

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
        select: "username fullName profileImg isVerified", // Corrected: Specific inclusions only
      })
      .populate({
        path: "repliedTo",
        select: "text img",
        // Nested populate
        populate: {
          path: "sender",
          select: "username fullName profileImg isVerified", // Corrected: Specific inclusions only
        },
      })
      .populate({
        path: "reactions.user",
        select: "username fullName profileImg", // Corrected: Specific inclusions only
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
