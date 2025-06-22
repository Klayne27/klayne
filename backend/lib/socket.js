import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";
import mongoose from "mongoose";
import Notification from "../models/notification.model.js";

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.RENDER_EXTERNAL_URL,
];

const userActiveChats = new Map();

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

export const onlineUsersMap = new Map();

export function getReceiverSocketIds(userId) {
  return onlineUsersMap.has(userId) ? Array.from(onlineUsersMap.get(userId)) : [];
}

function getOnlineUserIds() {
  return Array.from(onlineUsersMap.keys()).filter((userId) => {
    const sockets = onlineUsersMap.get(userId);
    return sockets && sockets.size > 0;
  });
}

export async function emitUnreadMessageStatus(userId) {
  try {
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const activeConversationId = userActiveChats.get(userId.toString());
    let activeConversationIdObj = null;

    const query = {
      participants: userIdObj,
      "lastMessage.sender": { $ne: userIdObj },
      "lastMessage.seen": false,
      "lastMessage.text": { $exists: true, $ne: "" },
    };

    if (activeConversationId) {
      try {
        activeConversationIdObj = new mongoose.Types.ObjectId(activeConversationId);
        query._id = { $ne: activeConversationIdObj };

      } catch (objIdError) {
        console.error(
          `Error converting activeConversationId '${activeConversationId}' to ObjectId for user ${userId}:`,
          objIdError
        );
      }
    }

    const conversationsWithUnseenLastMessage = await Conversation.countDocuments(query);

    const hasUnread = conversationsWithUnseenLastMessage > 0;


    const recipientSocketIds = getReceiverSocketIds(userId);
    recipientSocketIds.forEach((socketId) => {
      io.to(socketId).emit("unreadMessageStatus", { hasUnread });
    });
  } catch (error) {
    console.error(
      `Unhandled error in emitUnreadMessageStatus for user ${userId}:`,
      error
    );
  }
}

// NEW FUNCTION: Emit unread notification status
export async function emitUnreadNotificationStatus(userId) {
  try {
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const unreadNotificationsCount = await Notification.countDocuments({
      to: userIdObj,
      read: false,
    });

    const hasUnreadNotifications = unreadNotificationsCount > 0; // This will be true if a new one was added

    const recipientSocketIds = getReceiverSocketIds(userId);
    recipientSocketIds.forEach((socketId) => {
      // This emits { hasUnreadNotifications: true } if there are unread
      io.to(socketId).emit("unreadNotificationStatus", { hasUnreadNotifications });
    });
  } catch (error) {
    console.error(
      `Unhandled error in emitUnreadNotificationStatus for user ${userId}:`,
      error
    );
  }
}

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

    emitUnreadMessageStatus(userId);
    emitUnreadNotificationStatus(userId); // NEW: Emit notification status on connection
  } else {
    console.warn(
      `Client connected with invalid or missing userId: '${userId}' (socket ID: ${socket.id}). Disconnecting.`
    );
    socket.disconnect(true);
    return;
  }

  io.emit("getOnlineUsers", getOnlineUserIds());
  console.log("Updated online user IDs after connection:", getOnlineUserIds());

  socket.on("markMessagesAsSeen", async ({ conversationId }) => {
    try {
      const readerId = socket.userId;

      await Message.updateMany(
        { conversationId: conversationId, sender: { $ne: readerId }, seen: false },
        { $set: { seen: true } }
      );
      await Conversation.updateOne(
        { _id: conversationId, "lastMessage.sender": { $ne: readerId } },
        { $set: { "lastMessage.seen": true } }
      );

      const conversation = await Conversation.findById(conversationId);

      if (conversation) {
        const otherParticipantId = conversation.participants.find(
          (pId) => pId.toString() !== readerId.toString()
        );

        if (otherParticipantId) {
          const recipientSocketIds = getReceiverSocketIds(otherParticipantId.toString());
          recipientSocketIds.forEach((sockId) => {
            io.to(sockId).emit("messagesSeen", { conversationId, readerId });
          });
          await emitUnreadMessageStatus(otherParticipantId.toString());
        }

        await emitUnreadMessageStatus(readerId);
      }
    } catch (error) {
      console.error("Error marking messages as seen:", error);
    }
  });

  // NEW: Socket event to mark notifications as read
  socket.on("markNotificationsAsRead", async () => {
    try {
      const userId = socket.userId;
      if (!userId) {
        console.warn("Attempted to mark notifications as read without a userId.");
        return;
      }
      await Notification.updateMany(
        { to: userId, read: false },
        { $set: { read: true } }
      );
      await emitUnreadNotificationStatus(userId); // Update status for the user
      console.log(`User ${userId} marked all notifications as read.`);
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  });

  socket.on("userActiveInChat", ({ conversationId }) => {
    userActiveChats.set(userId, conversationId ? conversationId.toString() : null);
    emitUnreadMessageStatus(userId);
  });

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

    if (userId) {
      console.log(`Backend: User ${userId} disconnected. Clearing active chat status.`);
      userActiveChats.delete(userId);
    }
  });
});

export { io, server, app };
