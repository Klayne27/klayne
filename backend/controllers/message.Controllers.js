// backend/controllers/message.Controllers.js

import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import { getReceiverSocketIds, io } from "../lib/socket.js";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/user.model.js";

export const sendMessage = async (req, res) => {
  try {
    const { recipientId, message, conversationId: incomingConversationId } = req.body; // Get incomingConversationId
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
      // If a conversationId is provided, try to find it
      conversation = await Conversation.findById(incomingConversationId);
      if (!conversation || !conversation.participants.includes(senderId)) {
        return res
          .status(403)
          .json({ error: "Unauthorized or invalid conversation ID." });
      }
    } else {
      // If no conversationId is provided, find or create based on participants
      conversation = await Conversation.findOne({
        participants: { $all: [senderId, recipientId] },
      });

      if (!conversation) {
        // Create new conversation if it doesn't exist
        conversation = new Conversation({
          participants: [senderId, recipientId],
          lastMessage: null, // Will be updated by the new message
        });
        await conversation.save(); // Save to get the _id for the message
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
      seen: false, // Messages are initially unseen by recipient
    });

    await newMessage.save();

    // Update the lastMessage of the conversation
    conversation.lastMessage = {
      text: message || "",
      img: uploadedImgUrl,
      sender: senderId,
      seen: false, // Last message is unseen by recipient
      createdAt: newMessage.createdAt,
    };
    await conversation.save();

    // Populate sender details for the new message before sending via socket
    await newMessage.populate("sender", "username profileImg fullName isVerified");

    // Socket.io emission
    // Emit to recipient
    const recipientSocketIds = getReceiverSocketIds(recipientId.toString());
    if (recipientSocketIds.length > 0) {
      recipientSocketIds.forEach((socketId) => {
        io.to(socketId).emit("newMessage", newMessage);
      });
    }

    // Emit to sender's other devices (if any)
    const senderSocketIds = getReceiverSocketIds(senderId.toString());
    if (senderSocketIds.length > 0) {
      senderSocketIds.forEach((socketId) => {
        // Avoid sending duplicate if already sent to own device via recipient
        // This is a subtle point: if sender is also recipient, this might be redundant.
        // For 1-on-1, only recipientSocketIds is strictly necessary for real-time update.
        // But for consistency across multiple sender devices, it's good to also emit.
        io.to(socketId).emit("newMessage", newMessage);
      });
    }

    // NEW: Return both the new message and the conversation ID
    res.status(201).json({ newMessage, conversationId: conversation._id });
  } catch (error) {
    console.error("Error in sendMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

// NEW: Controller to get messages by conversation ID
export const getMessagesByConversationId = async (req, res) => {
  const { conversationId } = req.params; // Get conversationId from params
  const userId = req.user._id;

  try {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found." });
    }

    // Ensure the current user is a participant of this conversation
    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ error: "Unauthorized access to conversation." });
    }

    const messages = await Message.find({
      conversationId: conversation._id,
    })
      .sort({ createdAt: 1 })
      .populate("sender", "username profileImg fullName isVerified"); // Also populate fullName

    // Find the other participant in the conversation
    const otherParticipantId = conversation.participants.find(
      (participantId) => participantId.toString() !== userId.toString()
    );

    // Mark messages as seen only if they were sent by the other user and are currently unseen
    await Message.updateMany(
      { conversationId: conversation._id, sender: otherParticipantId, seen: false },
      { $set: { seen: true } }
    );

    // Mark the last message in the conversation as seen if it was sent by the other user
    if (
      conversation.lastMessage &&
      conversation.lastMessage.sender.toString() === otherParticipantId.toString() &&
      !conversation.lastMessage.seen // Only update if it's currently unseen
    ) {
      await Conversation.updateOne(
        { _id: conversation._id },
        { $set: { "lastMessage.seen": true } }
      );
    }

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessagesByConversationId controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const getConversations = async (req, res) => {
  const userId = req.user._id;

  try {
    const conversations = await Conversation.find({ participants: userId })
      .populate({
        path: "participants",
        select: "username profileImg fullName isVerified",
      })
      .sort({ updatedAt: -1 });

    const processedConversations = conversations
      .map((conversation) => {
        const otherParticipant = conversation.participants.find(
          (participant) => participant && participant._id.toString() !== userId.toString()
        );

        if (!otherParticipant) {
          console.warn(
            `Conversation ${conversation._id} has no other participant for user ${userId}`
          );
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
          : null; // `updatedAt` is on the conversation object directly

        return {
          _id: conversation._id,
          participants: [otherParticipant],
          lastMessage: lastMessageData,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt, // Correctly use conversation's updatedAt
        };
      })
      .filter(Boolean); // Filter out any null conversations

    res.status(200).json(processedConversations);
  } catch (error) {
    console.error("Error in getConversations controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

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

    const followedUsers = currentUser.following.filter(Boolean); // Ensure no nulls in following array

    res.status(200).json(followedUsers);
  } catch (error) {
    console.error("Error in getFollowedUsersForMessaging controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};
