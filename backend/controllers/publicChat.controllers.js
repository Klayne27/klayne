import { getReceiverSocketIds, io, PUBLIC_CHAT_ROOM } from "../lib/socket.js";
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

export const sendPublicMessage = async (req, res) => {
  try {
    // Now expecting 'replyTo' in addition to 'content' and 'imgBase64'
    const { content, imgBase64, replyTo } = req.body;
    const senderId = req.user._id;
    let img = null; // Initialize img to null

    // Check if the sender is banned from public chat
    if (await isBanned(senderId)) {
      return res.status(403).json({ error: "You are banned from the public chat." });
    }

    // Handle image upload if imgBase64 is provided
    if (imgBase64) {
      const uploadResponse = await cloudinary.uploader.upload(imgBase64, {
        folder: "public-chat-images",
      });
      img = uploadResponse.secure_url;
    }

    // Ensure at least content or an image is provided
    if (!content && !img) {
      return res.status(400).json({ error: "Message content or image is required." });
    }

    let newMessageData = {
      sender: senderId,
      content: content || "", // Ensure content is an empty string if not provided
      img: img, // Will be null if no imageBase64 was sent
    };

    // If 'replyTo' message ID is provided, validate it
    if (replyTo) {
      const repliedMessage = await PublicChatMessage.findById(replyTo);
      if (!repliedMessage) {
        return res.status(404).json({ error: "Message being replied to not found." });
      }
      newMessageData.replyTo = replyTo; // Add the replyTo ID to the message data
    }

    const newPublicMessage = new PublicChatMessage(newMessageData);
    await newPublicMessage.save();

    // Populate sender and replyTo details for the real-time broadcast via Socket.io
    // This ensures clients receive full data for display immediately
    await newPublicMessage.populate([
      {
        path: "sender",
        select: "username fullName profileImg isAdmin",
      },
      {
        path: "replyTo", // Populate the replied-to message
        select: "sender content img isDeletedByAdmin", // Select relevant fields for the preview
        populate: {
          path: "sender", // Populate the sender of the replied-to message
          select: "username isBannedInPublicChat", // Select their username and ban status
        },
      },
    ]);

    // Emit the new message to all connected clients in the public chat room
    io.to(PUBLIC_CHAT_ROOM).emit("newPublicMessage", newPublicMessage);

    res.status(201).json(newPublicMessage);
  } catch (error) {
    console.error("Error in sendPublicMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// --- getPublicMessages Controller ---
export const getPublicMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const messages = await PublicChatMessage.find()
      .sort({ createdAt: -1 }) // Sort by newest first to get the latest messages
      .skip(skip)
      .limit(limit)
      .populate([
        {
          path: "sender",
          select: "username fullName profileImg isAdmin isVerified isBannedInPublicChat",
        },
        {
          path: "replyTo", // Populate the replied-to message
          select: "sender content img isDeletedByAdmin", // Select minimal fields needed for reply preview
          populate: {
            path: "sender", // Populate the sender of the replied-to message
            select: "username isBannedInPublicChat", // Select their username and ban status
          },
        },
        {
          path: "reactions.userId",
          // >>> IMPORTANT: Match the select from addReactionToPublicMessage <<<
          select: "username profileImg fullName",
        },
      ])
      .lean(); // Use .lean() for faster queries, returns plain JavaScript objects

    // Reverse the messages to display them in chronological order (oldest first)
    // for correct rendering in infinite scrolling lists
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
    const adminId = req.user._id;

    // Assuming isAdmin function verifies admin status
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
    // Clear content and image if not already done by client on optimisitic update
    message.content = "[Message Deleted]"; // Standardize the display
    message.img = null; // Remove image URL
    await message.save();

    // Emit an event to inform clients about the admin-deleted message
    io.to(PUBLIC_CHAT_ROOM).emit("publicMessageDeleted", { messageId: message._id });

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
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.isAdmin) return res.status(403).json({ error: "Cannot ban another admin." });

    user.isBannedInPublicChat = true;
    await user.save();

    // --- ✅ START OF FIX ---

    // 1. Find all active socket IDs for the banned user.
    const bannedUserSocketIds = getReceiverSocketIds(userId);

    if (bannedUserSocketIds.length > 0) {
      bannedUserSocketIds.forEach((socketId) => {
        // Get the full socket instance from the main 'io' server
        const socketInstance = io.sockets.sockets.get(socketId);
        if (socketInstance) {
          // 2. Forcefully remove them from the room on the server.
          socketInstance.leave(PUBLIC_CHAT_ROOM);

          // 3. Send a direct event to THIS user's client to trigger the UI update.
          socketInstance.emit("bannedFromPublicChat", { isBanned: true });
        }
      });
    }

    // --- END OF FIX ---

    // 4. Broadcast to everyone else in the room so their UIs can update (e.g., filter messages).
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

// Admin action: Unban a user from the public chat
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

    // --- ✅ START OF FIX ---
    const unbannedUserSocketIds = getReceiverSocketIds(userId);

    if (unbannedUserSocketIds.length > 0) {
      unbannedUserSocketIds.forEach((socketId) => {
        const socketInstance = io.sockets.sockets.get(socketId);
        if (socketInstance) {
          // Allow the user to rejoin the room
          socketInstance.join(PUBLIC_CHAT_ROOM);

          // Notify the user's client that they are no longer banned
          socketInstance.emit("bannedFromPublicChat", { isBanned: false });
        }
      });
    }
    // --- END OF FIX ---

    // Notify others in the room
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

    const allowedEmojis = ["❤️", "👍", "😂", "😭", "😡"];
    if (!allowedEmojis.includes(emoji)) {
      return res.status(400).json({ error: "Invalid emoji." });
    }

    if (await isBanned(userId)) {
      return res
        .status(403)
        .json({ error: "You are banned from the public chat and cannot react." });
    }

    const message = await PublicChatMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found." });
    }

    // --- NEW LOGIC START ---
    // Find if the current user already reacted with THIS SPECIFIC EMOJI
    const existingSpecificEmojiReactionIndex = message.reactions.findIndex(
      (reaction) =>
        reaction.userId.toString() === userId.toString() && reaction.emoji === emoji
    );

    let actionTaken = ""; // For logging/debugging

    if (existingSpecificEmojiReactionIndex !== -1) {
      // User already reacted with this specific emoji -> REMOVE it
      message.reactions.splice(existingSpecificEmojiReactionIndex, 1);
      actionTaken = "removed specific emoji";
    } else {
      // User has NOT reacted with this specific emoji -> ADD it
      message.reactions.push({ emoji, userId });
      actionTaken = "added specific emoji";
    }
    // --- NEW LOGIC END ---

    await message.save();

    const populatedMessage = await PublicChatMessage.findById(messageId)
      .populate({
        path: "sender",
        select: "username fullName profileImg isAdmin isBannedInPublicChat",
      })
      .populate({
        path: "reactions.userId",
        select: "username profileImg fullName",
      })
      .lean();

    io.to(PUBLIC_CHAT_ROOM).emit("publicMessageReactionUpdated", {
      messageId: populatedMessage._id,
      reactions: populatedMessage.reactions,
    });

    res.status(200).json(populatedMessage.reactions);
  } catch (error) {
    console.error("Error in addReactionToPublicMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteOwnPublicMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id; // User attempting the deletion

    const message = await PublicChatMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found." });
    }

    // Authorization check: Only the sender can delete their message
    // Or if you want admins to delete any message:
    // const isUserAdmin = req.user.isAdmin; // Assuming isAdmin is on req.user from auth middleware
    // if (message.sender.toString() !== userId.toString() && !isUserAdmin) {

    if (message.sender.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "You are not authorized to delete this message." });
    }

    // Perform the deletion
    await PublicChatMessage.deleteOne({ _id: messageId }); // Use deleteOne or findByIdAndDelete

    // Emit message deletion to all clients in the public chat room
    // This is crucial for real-time updates
    io.to(PUBLIC_CHAT_ROOM).emit("publicOwnMessageDeleted", {
      messageId: message._id,
      senderId: message.sender.toString(), // Useful for frontend to quickly remove from UI
    });

    res.status(200).json({ message: "Message deleted successfully." });
  } catch (error) {
    console.error("Error in deletePublicMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Add this function to your controllers/publicChatController.js file
export const editPublicMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { newContent } = req.body;
    const userId = req.user._id; // Authenticated user ID

    if (!newContent || newContent.trim() === "") {
      return res.status(400).json({ error: "Edited content cannot be empty." });
    }

    const message = await PublicChatMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found." });
    }

    // Only the original sender can edit their message
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ error: "You are not authorized to edit this message." });
    }

    // Prevent editing if the message has been deleted by an admin
    if (message.isDeletedByAdmin) {
      return res.status(403).json({ error: "Cannot edit a message deleted by an admin." });
    }

    message.content = newContent;
    message.isEdited = true;
    message.editedAt = new Date(); // Set current time for edited timestamp

    await message.save();

    // Populate the message to send back over socket.io and as response
    // Ensure all necessary fields are populated for consistency with getPublicMessages
    const populatedMessage = await PublicChatMessage.findById(messageId)
      .populate([
        {
          path: "sender",
          select: "username fullName profileImg isAdmin isVerified isBannedInPublicChat",
        },
        {
          path: "replyTo",
          select: "sender content img isDeletedByAdmin",
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

    // Emit event to all clients in the public chat room
    io.to(PUBLIC_CHAT_ROOM).emit("publicMessageEdited", {
      messageId: populatedMessage._id,
      updatedMessage: populatedMessage,
    });

    res.status(200).json(populatedMessage);
  } catch (error) {
    console.error("Error in editPublicMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// export const removeReactionFromPublicMessage = async (req, res) => {
//   try {
//     const { messageId } = req.params;
//     const userId = req.user._id; // The user removing the reaction

//     const message = await PublicChatMessage.findById(messageId);

//     if (!message) {
//       return res.status(404).json({ error: "Message not found." });
//     }

//     // Filter out the reaction from the current user
//     const initialReactionCount = message.reactions.length;
//     message.reactions = message.reactions.filter(
//       (reaction) => reaction.userId.toString() !== userId.toString()
//     );

//     if (message.reactions.length === initialReactionCount) {
//       return res.status(400).json({ error: "User has no reaction to remove from this message." });
//     }

//     await message.save();

//     // Populate sender details for real-time broadcast (to get profileImg, username etc. for reactee)
//     await message.populate({
//         path: "sender",
//         select: "username fullName profileImg isAdmin isBannedInPublicChat",
//     });

//     // Populate reactions.userId to get details of users who reacted
//     for (let i = 0; i < message.reactions.length; i++) {
//         await message.reactions[i].populate({
//             path: 'userId',
//             select: 'username profileImg' // Select relevant fields
//         });
//     }

//     // Emit reaction update to all clients in the public chat room
//     io.to(PUBLIC_CHAT_ROOM).emit("publicMessageReactionUpdated", {
//       messageId: message._id,
//       reactions: message.reactions, // Send the full updated reactions array
//     });

//     res.status(200).json(message.reactions); // Or send the whole updated message
//   } catch (error) {
//     console.error("Error in removeReactionFromPublicMessage controller: ", error.message);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };