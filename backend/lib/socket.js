// socket.js - FIXED VERSION

import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    // Ensure this origin matches your frontend development server (e.g., React/Vite default is 5173, Next.js default is 3000)
    origin: ["http://localhost:3000", "http://localhost:5173"], // Added 5173 for common setups
    methods: ["GET", "POST"], // It's good practice to explicitly define methods for CORS
    credentials: true, // Crucial if your frontend sends cookies or auth headers with the socket connection
  },
});

// ========================================================================
// 1. Online Users Tracking: Robustly store userId -> Set of socketIds
//    This allows a single user to have multiple open tabs/devices.
// ========================================================================
// Replaced userSocketMap with onlineUsersMap
const onlineUsersMap = new Map(); // Key: userId (String), Value: Set<socketId (String)>

export function getReceiverSocketIds(userId) {
  return onlineUsersMap.has(userId) ? Array.from(onlineUsersMap.get(userId)) : [];
}

function getOnlineUserIds() {
  // Filter out any user IDs that might exist in the map but have no active sockets left
  return Array.from(onlineUsersMap.keys()).filter((userId) => {
    const sockets = onlineUsersMap.get(userId);
    return sockets && sockets.size > 0;
  });
}

// ========================================================================
// 2. Socket.IO Connection Handling
// ========================================================================
io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  const userId = socket.handshake.query.userId;

  if (
    userId &&
    typeof userId === "string" &&
    userId.trim() !== "" &&
    userId.toLowerCase() !== "undefined"
  ) {
    if (!onlineUsersMap.has(userId)) {
      onlineUsersMap.set(userId, new Set());
    }
    onlineUsersMap.get(userId).add(socket.id);

    socket.userId = userId;

    console.log(
      `User ${userId} (socket ${socket.id}) connected. Total connections for user: ${
        onlineUsersMap.get(userId).size
      }`
    );
  } else {
    console.warn(
      `Client connected with invalid or missing userId: '${userId}' (socket ID: ${socket.id}). Disconnecting.`
    );
    socket.disconnect(true);
    return;
  }

  // Emit the updated list of online user IDs to ALL connected clients
  io.emit("getOnlineUsers", getOnlineUserIds());
  console.log("Updated online user IDs after connection:", getOnlineUserIds());

  // ========================================================================
  // 3. 'markMessagesAsSeen' Event Handling
  // ========================================================================
  socket.on("markMessagesAsSeen", async ({ conversationId }) => {
    // Removed userId from payload - use socket.userId
    try {
      const readerId = socket.userId; // Get the ID of the user who performed the action from the socket

      // 1. Update database: Mark messages as seen
      // Only mark messages as seen that were sent by someone *else* in this conversation
      await Message.updateMany(
        { conversationId: conversationId, sender: { $ne: readerId }, seen: false },
        { $set: { seen: true } }
      );
      // Update the 'lastMessage.seen' field in the Conversation model
      await Conversation.updateOne(
        { _id: conversationId },
        { $set: { "lastMessage.seen": true } } // This will mark the last message as seen for anyone viewing the conversation
      );

      // 2. Emit notification to relevant users (e.g., the sender of the messages that were seen)
      // Find the conversation to get details about participants/last sender
      const conversation = await Conversation.findById(conversationId);

      if (conversation) {
        // Identify the sender(s) of messages in this conversation (excluding the current reader)
        // For 1-on-1, it's the other participant. For group, it's anyone but the reader.
        const participantsToNotify = conversation.participants.filter(
          (pId) => pId.toString() !== readerId.toString()
        );

        participantsToNotify.forEach((participantId) => {
          const recipientSocketIds = getReceiverSocketIds(participantId.toString());
          recipientSocketIds.forEach((sockId) => {
            // Emit an event to notify the other participant(s) that messages have been seen
            io.to(sockId).emit("messagesSeen", { conversationId, readerId });
          });
        });
      }

      console.log(
        `Messages in conversation ${conversationId} marked as seen by ${readerId}.`
      );
    } catch (error) {
      console.error("Error marking messages as seen:", error);
    }
  });

  // ========================================================================
  // 4. Disconnection Handling
  // ========================================================================
  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);

    // Retrieve the userId from the socket object itself (set during connection)
    const disconnectedUserId = socket.userId;

    if (disconnectedUserId && onlineUsersMap.has(disconnectedUserId)) {
      const userSockets = onlineUsersMap.get(disconnectedUserId);
      userSockets.delete(socket.id); // Remove the specific disconnected socket ID

      // If the user has no more active sockets, remove them from the online map entirely
      if (userSockets.size === 0) {
        onlineUsersMap.delete(disconnectedUserId);
        console.log(`User ${disconnectedUserId} is now completely offline.`);
      } else {
        console.log(
          `User ${disconnectedUserId} still has ${userSockets.size} active connections.`
        );
      }
    } else {
      console.warn(
        `Disconnected socket ${socket.id} had no associated valid userId in map or was already removed.`
      );
    }

    // Emit the updated list of unique online user IDs to ALL connected clients after disconnect
    io.emit("getOnlineUsers", getOnlineUserIds());
    console.log("Updated online user IDs after disconnect:", getOnlineUserIds());
  });

  // ========================================================================
  // 5. Placeholder for Other Real-time Messaging Events
  //    (e.g., sendMessage, typing indicators, delete message)
  // ========================================================================
  // Example: Listen for a 'sendMessage' event from a client
  // socket.on("sendMessage", async (messageData) => {
  //   // 1. Validate messageData and sender (socket.userId)
  //   // 2. Save the message to your Message and update Conversation models in DB
  //   // 3. Get receiver(s) socket IDs using getReceiverSocketIds(receiverId)
  //   // 4. Emit a 'newMessage' event to all recipient's sockets AND sender's other sockets
  // });

  // socket.on("typing", ({ conversationId, isTyping }) => {
  //   // Emit 'typing' event to other participants in the conversation
  //   // (Excluding the user who is typing)
  // });
});

// ========================================================================
// 6. Exports
// ========================================================================
export { io, server, app };
