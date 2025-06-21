import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import { getReceiverSocketIds, io, emitUnreadMessageStatus } from "../lib/socket.js"; // Import emitUnreadMessageStatus
import { v2 as cloudinary } from "cloudinary";
import User from "../models/user.model.js";

export const sendMessage = async (req, res) => {
  try {
    const {
      recipientId,
      message,
      conversationId: incomingConversationId,
      repliedTo,
    } = req.body;
    let { img } = req.body;
    const senderId = req.user._id;

    if (senderId.toString() === recipientId.toString()) {
      return res.status(400).json({ error: "You cannot message yourself." });
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
      seen: false, // New messages are always initially unseen
      repliedTo: repliedTo || null,
    });

    await newMessage.save();

    conversation.lastMessage = {
      text: message || "",
      img: uploadedImgUrl,
      sender: senderId,
      seen: false, // Last message in conversation is unseen for the recipient
      createdAt: newMessage.createdAt,
    };

    conversation.deletedFor = []; // Reset deletedFor for new messages in conversation

    await conversation.save();

    await newMessage.populate("sender", "username profileImg fullName isVerified");

    if (newMessage.repliedTo) {
      await newMessage.populate("repliedTo", "sender text img");
      await newMessage.populate({
        path: "repliedTo",
        populate: {
          path: "sender",
          select: "username fullName profileImg isVerified",
        },
      });
    }

    // Emit 'newMessage' to both sender and recipient
    const recipientSocketIds = getReceiverSocketIds(recipientId.toString());
    if (recipientSocketIds.length > 0) {
      recipientSocketIds.forEach((socketId) => {
        io.to(socketId).emit("newMessage", newMessage);
      });
    }

    const senderSocketIds = getReceiverSocketIds(senderId.toString());
    if (senderSocketIds.length > 0) {
      senderSocketIds.forEach((socketId) => {
        io.to(socketId).emit("newMessage", newMessage);
      });
    }

    // Emit unread message status to the recipient to show the red dot
    await emitUnreadMessageStatus(recipientId.toString());
    // await emitUnreadMessageStatus(receiverId);
    await emitUnreadMessageStatus(senderId.toString());

    res.status(201).json({ newMessage, conversationId: conversation._id });
  } catch (error) {
    console.error("Error in sendMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const getMessagesByConversationId = async (req, res) => {
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

    // Find messages where the sender is not the current user and they are unseen
    const otherParticipantId = conversation.participants.find(
      (participantId) => participantId.toString() !== userId.toString()
    );

    if (otherParticipantId) {
      await Message.updateMany(
        { conversationId: conversation._id, sender: otherParticipantId, seen: false },
        { $set: { seen: true } }
      );

      // Update lastMessage.seen in conversation if the last message was from the other participant and unseen
      if (
        conversation.lastMessage &&
        conversation.lastMessage.sender.toString() === otherParticipantId.toString() &&
        !conversation.lastMessage.seen
      ) {
        await Conversation.updateOne(
          { _id: conversation._id },
          { $set: { "lastMessage.seen": true } }
        );
      }

      // After marking messages as seen, emit updated unread status for the current user (reader)
      await emitUnreadMessageStatus(userId.toString());

      // Also, inform the other participant that their messages have been seen by the current user
      // This will also trigger an unread status update for the other participant (if they had any messages marked as unseen by current user)
      const recipientSocketIds = getReceiverSocketIds(otherParticipantId.toString());
      recipientSocketIds.forEach((socketId) => {
        io.to(socketId).emit("messagesSeen", {
          conversationId,
          readerId: userId.toString(),
        });
      });
      await emitUnreadMessageStatus(otherParticipantId.toString());
    }

    const messages = await Message.find({
      conversationId: conversation._id,
    })
      .sort({ createdAt: 1 })
      .populate("sender", "username profileImg fullName isVerified")
      .populate({
        path: "repliedTo",
        select: "sender text img",
        populate: {
          path: "sender",
          select: "username fullName profileImg isVerified",
        },
      })
      .sort({ createdAt: 1 }); // Sort again to ensure correct order

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessagesByConversationId controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const getConversations = async (req, res) => {
  const userId = req.user._id;

  try {
    const conversations = await Conversation.find({
      participants: userId, // User must be a participant
      // Filter out conversations that definitely don't have enough participants
      // This looks for conversations where the 'participants' array has at least two elements.
      "participants.1": { $exists: true },
      // Exclude conversations marked as deleted for the current user
      "deletedFor.user": { $ne: userId },
    })
      .populate({
        path: "participants",
        select: "username profileImg fullName isVerified",
      })
      .sort({ updatedAt: -1 });

    const processedConversations = conversations
      .map((conversation) => {
        // After population, it's possible that some participants resolved to null
        // if the user IDs in the array no longer exist in the User collection.
        // We filter again here to ensure we have at least two *valid* participants.
        const validParticipants = conversation.participants.filter((p) => p && p._id); // Filter out nulls from populate

        if (validParticipants.length < 2) {
          // No need for console.warn here, as we're intentionally filtering them out.
          // The cleanup script (which we'll enhance) should deal with these from the DB.
          return null;
        }

        const otherParticipant = validParticipants.find(
          (participant) => participant._id.toString() !== userId.toString()
        );

        if (!otherParticipant) {
          // This scenario means `userId` is the only valid participant left after filtering.
          return null;
        }

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
          participants: [otherParticipant], // Return only the other participant
          lastMessage: lastMessageData,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        };
      })
      .filter(Boolean); // Filter out any null values resulting from the map function

    res.status(200).json(processedConversations);
  } catch (error) {
    console.error("Error in getConversations controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

// Your getFollowedUsersForMessaging controller seems fine as it's not directly related
// to displaying active conversations or their deletion status.
export const getFollowedUsersForMessaging = async (req, res) => {
  try {
    const userId = req.user._id;

    const currentUser = await User.findById(userId).populate({
      path: "following",
      select: "username profileImg fullName isVerified",
    });

    if (!currentUser) {
      return res.status(404).json({ error: "User not found." });
    }

    const followedUsers = currentUser.following.filter(Boolean);

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

    if (messageToDelete.img) {
      const imgId = messageToDelete.img.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(imgId);
    }

    await Message.findByIdAndDelete(messageId);

    const conversation = await Conversation.findById(messageToDelete.conversationId);
    if (conversation) {
      if (
        conversation.lastMessage &&
        conversation.lastMessage.text === messageToDelete.text &&
        conversation.lastMessage.sender.toString() === messageToDelete.sender.toString()
      ) {
        const newLastMessage = await Message.findOne({ conversationId: conversation._id })
          .sort({ createdAt: -1 })
          .limit(1);

        if (newLastMessage) {
          conversation.lastMessage = {
            text: newLastMessage.text,
            img: newLastMessage.img,
            sender: newLastMessage.sender,
            seen: newLastMessage.seen,
            createdAt: newLastMessage.createdAt,
          };
        } else {
          conversation.lastMessage = null;
        }
        await conversation.save();
      }
    }

    const participants = conversation ? conversation.participants : [];
    for (const participantId of participants) {
      // Use for...of for async operations
      const socketIds = getReceiverSocketIds(participantId.toString());
      socketIds.forEach((socketId) => {
        io.to(socketId).emit("messageDeleted", {
          messageId,
          conversationId: messageToDelete.conversationId,
        });
      });
      // Emit updated unread status for each participant after message deletion
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
      return res.status(404).json({ error: "Conversation not found" }); // Changed to 404 for clarity
    }

    if (!conversation.participants.includes(userId)) {
      return res
        .status(403)
        .json({ error: "You are not a participant in this conversation" });
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

    // Emit unread status for the user after conversation is marked as deleted (could change their unread count)
    await emitUnreadMessageStatus(userId.toString());

    res.status(200).json({ message: "Conversation deleted successfully" });
  } catch (error) {
    console.error("Error deleting conversation for user:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
