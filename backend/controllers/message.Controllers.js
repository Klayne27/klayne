import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
// IMPORTANT: Use the new function from socket.js that returns an ARRAY of socket IDs
import { getReceiverSocketIds, io } from "../lib/socket.js";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/user.model.js"; // Assuming you have a User model for populating sender/recipient info

async function sendMessage(req, res) {
  try {
    const { recipientId, message } = req.body;
    let { img } = req.body;
    const senderId = req.user._id;

    if (senderId.toString() === recipientId.toString()) {
      return res.status(400).json({ error: "You cannot message yourself." });
    }

    const recipientUser = await User.findById(recipientId);
    if (!recipientUser) {
      return res.status(404).json({ error: "Recipient user not found." });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, recipientId] },
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [senderId, recipientId],
        // The lastMessage will be fully updated after the newMessage is saved
        // We set initial values here to ensure the field exists for a new conversation.
        lastMessage: {
          text: message || (img ? "Image" : ""),
          sender: senderId,
          seen: false,
          createdAt: new Date(),
        },
      });
      await conversation.save(); // Save the new conversation
    }

    if (img) {
      const uploadedResponse = await cloudinary.uploader.upload(img);
      img = uploadedResponse.secure_url;
    }

    const newMessage = new Message({
      conversationId: conversation._id,
      sender: senderId,
      text: message,
      img: img || "",
      seen: false,
    });

    // Save the new message
    await newMessage.save();

    // Update the conversation's lastMessage fields and its updatedAt timestamp
    // This happens AFTER newMessage is saved to ensure newMessage.createdAt is available
    conversation.lastMessage = {
      text: message || (img ? "Image" : ""),
      sender: senderId,
      seen: false,
      createdAt: newMessage.createdAt,
    };
    // Mongoose will automatically update `conversation.updatedAt` if `timestamps: true` is enabled in your schema
    await conversation.save();

    // Populate sender data for the message before sending via socket.io
    await newMessage.populate("sender", "username profilePic fullName"); // Added fullName for completeness

    // Emit to recipient's active sockets
    const recipientSocketIds = getReceiverSocketIds(recipientId.toString()); // Ensure ID is string for getReceiverSocketIds
    if (recipientSocketIds.length > 0) {
      recipientSocketIds.forEach((socketId) => {
        io.to(socketId).emit("newMessage", newMessage);
      });
    }

    // Emit to sender's active sockets (for other tabs)
    // Removed the problematic `socket.id !== socket.id` filter
    const senderSocketIds = getReceiverSocketIds(senderId.toString());
    if (senderSocketIds.length > 0) {
      senderSocketIds.forEach((socketId) => {
        io.to(socketId).emit("newMessage", newMessage);
      });
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
}

async function getMessages(req, res) {
  const { otherUserId } = req.params;
  const userId = req.user._id; // Authenticated user

  try {
    // Validate otherUserId to prevent accidental self-messaging or invalid IDs
    if (userId.toString() === otherUserId.toString()) {
      return res
        .status(400)
        .json({ error: "Cannot get messages with yourself this way." });
    }

    // Find the conversation between the two users
    const conversation = await Conversation.findOne({
      participants: { $all: [userId, otherUserId] },
    });

    if (!conversation) {
      // If no conversation exists, return empty array (no messages yet)
      return res.status(200).json([]); // Better to return empty array than 404 for no conversation
    }

    // Fetch messages for the found conversation, sorted by creation date
    // Populate the sender field if you need sender's username/profilePic on the frontend
    const messages = await Message.find({
      conversationId: conversation._id,
    })
      .sort({ createdAt: 1 })
      .populate("sender", "username profilePic"); // Populate sender for display

    await Message.updateMany(
      { conversationId: conversation._id, sender: otherUserId, seen: false },
      { $set: { seen: true } }
    );
    // Also update the lastMessage.seen for the current user's perspective in the conversation
    // This is more complex if you have per-user seen status, but for lastMessage, it's simpler.
    // If the last message was sent by the 'otherUserId', mark it seen
    if (
      conversation.lastMessage &&
      conversation.lastMessage.sender.toString() === otherUserId.toString()
    ) {
      await Conversation.updateOne(
        { _id: conversation._id },
        { $set: { "lastMessage.seen": true } }
      );
    }

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
}

async function getConversations(req, res) {
  const userId = req.user._id;

  try {
    // Find all conversations where the current user is a participant
    // Populate participants to get their username and profilePic
    const conversations = await Conversation.find({ participants: userId }).populate({
      path: "participants",
      select: "username profilePic fullName", // Fields to populate from User model
    });

    // For each conversation, process participants and populate lastMessage sender
    const processedConversations = conversations.map((conversation) => {
      // Filter out the current user from the participants array for the client
      const otherParticipant = conversation.participants.find(
        (participant) => participant._id.toString() !== userId.toString()
      );

      // Populate lastMessage.sender if it exists
      let lastMessage = null;
      if (conversation.lastMessage && conversation.lastMessage.sender) {
        // You need to manually populate the sender for embedded documents like lastMessage
        // or ensure your Conversation schema's lastMessage.sender has `ref: 'User'` and populate it
        // For now, let's just ensure its structure is consistent
        lastMessage = {
          ...conversation.lastMessage.toObject(), // Convert Mongoose document to plain object
          sender: conversation.lastMessage.sender, // This would be an ObjectId, not populated User
        };
        // To populate `lastMessage.sender` here, you'd either do a separate populate or
        // a virtual populate if your schema is set up for it, or just return the ID.
        // For now, it returns the ID, client can fetch user info if needed or you populate here.
      }

      return {
        _id: conversation._id,
        participants: [otherParticipant], // Only send the "other" participant to the client for 1-on-1 display
        lastMessage: {
          ...conversation.lastMessage?.toObject(), // Spread properties, handle if lastMessage is null
          // For the sender in lastMessage, you'd typically want its populated data.
          // If `conversation.lastMessage.sender` is an ObjectId, the client might need to resolve it.
          // A common approach is to also populate it here:
          // This might require a nested populate or a virtual depending on schema setup.
          // For now, assuming the client just expects the ID or you'll fetch user details on client.
        },
        createdAt: conversation.createdAt, // Include createdAt from conversation
        updatedAt: conversation.updatedAt, // Include updatedAt from conversation (reflects last activity)
      };
    });

    res.status(200).json(processedConversations);
  } catch (error) {
    console.error("Error in getConversations controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
}

async function getFollowedUsersForMessaging(req, res) {
  try {
    const userId = req.user._id;

    // Find the current user and populate their 'following' list
    const currentUser = await User.findById(userId).populate({
      path: "following",
      select: "username profilePic fullName", // Select fields relevant for display
    });

    if (!currentUser) {
      return res.status(404).json({ error: "User not found." });
    }

    // Filter out any invalid/non-existent users from the following list if necessary
    const followedUsers = currentUser.following.filter(Boolean); // Removes null/undefined entries

    res.status(200).json(followedUsers);
  } catch (error) {
    console.error("Error in getFollowedUsersForMessaging controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
}

export { sendMessage, getMessages, getConversations, getFollowedUsersForMessaging };
