import { io, PUBLIC_CHAT_ROOM } from "../lib/socket.js";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/user.model.js";
import PublicChatMessage from "../models/publicMessage.model.js";

// Helper function to check if a user is an admin
const isAdmin = async (userId) => {
  const user = await User.findById(userId).select("isAdmin");
  return user ? user.isAdmin : false;
};

// Helper function to check if a user is banned from the public chat
const isBanned = async (userId) => {
  const user = await User.findById(userId).select("isBannedInPublicChat");
  return user ? user.isBannedInPublicChat : false;
};

// Send a public chat message
export const sendPublicMessage = async (req, res) => {
  try {
    const { content, imgBase64 } = req.body; // Expecting imgBase64 here if you send base64
    const senderId = req.user._id;
    let img = null;

    if (await isBanned(senderId)) {
      return res.status(403).json({ error: "You are banned from the public chat." });
    }

    if (imgBase64) {
      // If sending base64, upload it directly to Cloudinary
      const uploadResponse = await cloudinary.uploader.upload(imgBase64, {
        folder: "public-chat-images", // Optional: specify a folder in Cloudinary
      });
      img = uploadResponse.secure_url;
    }

    if (!content && !img) {
      return res.status(400).json({ error: "Message content or image is required." });
    }

    const newPublicMessage = new PublicChatMessage({
      sender: senderId,
      content,
      img,
    });

    await newPublicMessage.save();

    // Populate sender details for real-time broadcast
    await newPublicMessage.populate({
      path: "sender",
      select: "username fullName profileImg isAdmin",
    });

    // Emit the new message to all connected clients in the public chat room
    io.to(PUBLIC_CHAT_ROOM).emit("newPublicMessage", newPublicMessage);

    res.status(201).json(newPublicMessage);
  } catch (error) {
    console.error("Error in sendPublicMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get public chat messages with pagination for infinite scrolling
export const getPublicMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; // Number of messages per page
    const skip = (page - 1) * limit;

    const messages = await PublicChatMessage.find()
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(limit)
      .populate({
        path: "sender",
        select: "username fullName profileImg",
      })
      .lean(); // Use .lean() for faster queries if you don't need Mongoose documents

    // Reverse the messages to display them in chronological order (oldest first) for infinite scrolling
    res.status(200).json(messages.reverse());
  } catch (error) {
    console.error("Error in getPublicMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Admin action: Delete a public chat message
export const deletePublicMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const adminId = req.user._id; // Assuming req.user is populated by your protectRoute middleware

    if (!(await isAdmin(adminId))) {
      return res
        .status(403)
        .json({ error: "Unauthorized: Only admins can delete messages." });
    }

    const message = await PublicChatMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found." });
    }

    // Mark the message as deleted by admin instead of actually deleting it
    message.isDeletedByAdmin = true;
    await message.save();

    // Emit an event to inform clients about the deleted message
    io.to(PUBLIC_CHAT_ROOM).emit("messageDeleted", { messageId: message._id });

    res.status(200).json({ message: "Message marked as deleted successfully." });
  } catch (error) {
    console.error("Error in deletePublicMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Admin action: Ban a user from the public chat
export const banUserFromPublicChat = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user._id;

    if (!(await isAdmin(adminId))) {
      return res.status(403).json({ error: "Unauthorized: Only admins can ban users." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (user.isAdmin) {
      return res
        .status(403)
        .json({ error: "Cannot ban another admin from public chat." });
    }

    user.isBannedInPublicChat = true;
    await user.save();

    // Optionally, disconnect the user from the public chat socket if they are currently connected
    // This requires a more direct way to find the public chat sockets of a user
    // For simplicity, we'll just rely on the backend check for sending messages.
    // If you need immediate disconnection, you'd iterate through onlineUsersMap and check if the banned user's sockets are in the 'public-chat' room.
    io.to(PUBLIC_CHAT_ROOM).emit("userBanned", {
      userId: user._id,
      username: user.username,
    });

    res
      .status(200)
      .json({ message: `User ${user.username} banned from public chat successfully.` });
  } catch (error) {
    console.error("Error in banUserFromPublicChat controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Admin action: Unban a user from the public chat
export const unbanUserFromPublicChat = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user._id;

    if (!(await isAdmin(adminId))) {
      return res
        .status(403)
        .json({ error: "Unauthorized: Only admins can unban users." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    user.isBannedInPublicChat = false;
    await user.save();

    io.to(PUBLIC_CHAT_ROOM).emit("userUnbanned", {
      userId: user._id,
      username: user.username,
    });

    res
      .status(200)
      .json({ message: `User ${user.username} unbanned from public chat successfully.` });
  } catch (error) {
    console.error("Error in unbanUserFromPublicChat controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
