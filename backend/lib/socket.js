// src/lib/socket.js
import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";
import mongoose from "mongoose";
import Notification from "../models/notification.model.js"; // Ensure Notification model is imported
import Comment from "../models/comment.model.js"; // Import the new Comment model

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

export async function emitUnreadNotificationStatus(userId) {
  try {
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const unreadNotificationsCount = await Notification.countDocuments({
      to: userIdObj,
      read: false,
    });

    const hasUnreadNotifications = unreadNotificationsCount > 0;

    const recipientSocketIds = getReceiverSocketIds(userId);
    recipientSocketIds.forEach((socketId) => {
      io.to(socketId).emit("unreadNotificationStatus", { hasUnreadNotifications });
    });
  } catch (error) {
    console.error(
      `Unhandled error in emitUnreadNotificationStatus for user ${userId}:`,
      error
    );
  }
}

export const createAndSendNotification = async ({
  from,
  to,
  type,
  postId,
  commentId = null, // Default to null for flexibility
  parentCommentId = null, // Default to null for flexibility
}) => {
  try {
    if (from.toString() === to.toString()) {
      // Don't send notification to self (e.g., commenting on your own post)
      return;
    }

    const newNotification = new Notification({
      from,
      to,
      type,
      postId,
      commentId,
      parentCommentId, // Include parentCommentId here
    });
    await newNotification.save();

    // Populate the 'from' user and 'postId' for real-time display on frontend
    await newNotification.populate({
      path: "from",
      select: "username fullName profileImg",
    });
    if (postId) {
      await newNotification.populate({
        path: "postId",
        select: "text img user", // Add other fields if needed for frontend display
      });
    }
    // Populate comment or parentComment if relevant for context
    if (commentId && newNotification.type !== "commentReply") {
      // Populate direct comment if not a reply notification
      await newNotification.populate({
        path: "commentId",
        select: "text user", // Select comment text and owner for context
      });
    }
    if (parentCommentId && newNotification.type === "commentReply") {
      // Populate parent comment for reply notifications
      await newNotification.populate({
        path: "parentCommentId",
        select: "text user", // Select parent comment text and owner for context
      });
    }

    // Send real-time notification via Socket.IO
    const receiverSocketIds = getReceiverSocketIds(to.toString()); // Use your existing helper
    receiverSocketIds.forEach((socketId) => {
      io.to(socketId).emit("newNotification", newNotification); // Emit a newNotification event
      console.log(
        `Real-time notification sent to ${to.toString()} (socket: ${socketId}) for type ${type}`
      );
    });

    // Also update the unread status for the receiver
    await emitUnreadNotificationStatus(to.toString());
  } catch (error) {
    console.error("Error in createAndSendNotification (socket.js): ", error.message);
  }
};

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
    emitUnreadNotificationStatus(userId);
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

      // Ensure ObjectIds are used for queries
      const conversationObjectId = new mongoose.Types.ObjectId(conversationId);
      const readerObjectId = new mongoose.Types.ObjectId(readerId);

      await Message.updateMany(
        {
          conversationId: conversationObjectId,
          sender: { $ne: readerObjectId },
          seen: false,
        },
        { $set: { seen: true } }
      );
      // Added `lastMessage: { $ne: null }` as a good practice from earlier discussion
      await Conversation.updateOne(
        {
          _id: conversationObjectId,
          lastMessage: { $ne: null },
          "lastMessage.sender": { $ne: readerObjectId },
        },
        { $set: { "lastMessage.seen": true } },
        { timestamps: false }
      );

      const conversation = await Conversation.findById(conversationObjectId).select(
        "participants"
      ); // Select only participants

      if (conversation) {
        const otherParticipantId = conversation.participants.find(
          (pId) => pId.toString() !== readerId.toString()
        );

        if (otherParticipantId) {
          const recipientSocketIds = getReceiverSocketIds(otherParticipantId.toString());
          recipientSocketIds.forEach((sockId) => {
            io.to(sockId).emit("messagesSeen", { conversationId, readerId });
          });
          // Defer non-critical status update slightly to prioritize messagesSeen event
          process.nextTick(async () => {
            await emitUnreadMessageStatus(otherParticipantId.toString());
          });
        }
        process.nextTick(async () => {
          await emitUnreadMessageStatus(readerId);
        });
      }
    } catch (error) {
      console.error("Error marking messages as seen:", error);
    }
  });

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
      await emitUnreadNotificationStatus(userId);
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

        console.warn(
          `Disconnected socket ${socket.id} had no associated valid userId in map or was already removed.`
        );
      }
    }

    io.emit("getOnlineUsers", getOnlineUserIds());

    if (userId) {
      console.log(`Backend: User ${userId} disconnected. Clearing active chat status.`);
      userActiveChats.delete(userId);
    }
  });
});

export { io, server, app };
