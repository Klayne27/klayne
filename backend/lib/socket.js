import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true, 
  },
});

// ========================================================================
// 1. Online Users Tracking: Robustly store userId -> Set of socketIds
//    This allows a single user to have multiple open tabs/devices.
// ========================================================================
const onlineUsersMap = new Map();

export function getReceiverSocketIds(userId) {
  return onlineUsersMap.has(userId) ? Array.from(onlineUsersMap.get(userId)) : [];
}

function getOnlineUserIds() {
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

  io.emit("getOnlineUsers", getOnlineUserIds());
  console.log("Updated online user IDs after connection:", getOnlineUserIds());

  // ========================================================================
  // 3. 'markMessagesAsSeen' Event Handling
  // ========================================================================
  socket.on("markMessagesAsSeen", async ({ conversationId }) => {
    try {
      const readerId = socket.userId;

      await Message.updateMany(
        { conversationId: conversationId, sender: { $ne: readerId }, seen: false },
        { $set: { seen: true } }
      );
      await Conversation.updateOne(
        { _id: conversationId },
        { $set: { "lastMessage.seen": true } }
      );

      const conversation = await Conversation.findById(conversationId);

      if (conversation) {
        const participantsToNotify = conversation.participants.filter(
          (pId) => pId.toString() !== readerId.toString()
        );

        participantsToNotify.forEach((participantId) => {
          const recipientSocketIds = getReceiverSocketIds(participantId.toString());
          recipientSocketIds.forEach((sockId) => {
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

    const disconnectedUserId = socket.userId;

    if (disconnectedUserId && onlineUsersMap.has(disconnectedUserId)) {
      const userSockets = onlineUsersMap.get(disconnectedUserId);
      userSockets.delete(socket.id);

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
