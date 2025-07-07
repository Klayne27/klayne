import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";
import mongoose from "mongoose";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.RENDER_EXTERNAL_URL,
];

const userActiveChats = new Map();
const typingUsersInConversation = new Map();

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

const isBlockedOrBlockedBy = async (currentUserId, targetUserId) => {
  if (!currentUserId || !targetUserId) return false;
  if (currentUserId.toString() === targetUserId.toString()) return false;

  const currentUser = await User.findById(currentUserId)
    .select("blockedUsers blockedBy")
    .lean();
  const targetUser = await User.findById(targetUserId)
    .select("blockedUsers blockedBy")
    .lean();

  if (!currentUser || !targetUser) return false;

  const currentUserBlockedTarget = (currentUser.blockedUsers || []).some(
    (id) => id.toString() === targetUserId.toString()
  );
  const targetUserBlockedCurrentUser = (targetUser.blockedUsers || []).some(
    (id) => id.toString() === currentUserId.toString()
  );

  return currentUserBlockedTarget || targetUserBlockedCurrentUser;
};

export async function emitUnreadMessageStatus(userId) {
  try {
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const activeConversationId = userActiveChats.get(userId.toString());
    let activeConversationIdObj = null;

    const currentUserBlockingData = await User.findById(userIdObj)
      .select("blockedUsers blockedBy")
      .lean();

    const blockedByMe =
      currentUserBlockingData?.blockedUsers?.map((id) => id.toString()) || [];
    const blockedMe =
      currentUserBlockingData?.blockedBy?.map((id) => id.toString()) || [];
    const blockedAndBlockingUsers = [...new Set([...blockedByMe, ...blockedMe])];

    const baseQueryConditions = [
      { participants: userIdObj },
      { "lastMessage.sender": { $ne: userIdObj } },
      { "lastMessage.seen": false },
      { "lastMessage.text": { $exists: true, $ne: "" } },
      { "deletedFor.user": { $ne: userIdObj } },
    ];

    baseQueryConditions.push({
      participants: {
        $nin: blockedAndBlockingUsers.map((id) => new mongoose.Types.ObjectId(id)),
      },
    });

    if (activeConversationId) {
      try {
        activeConversationIdObj = new mongoose.Types.ObjectId(activeConversationId);
        baseQueryConditions.push({ _id: { $ne: activeConversationIdObj } });
      } catch (objIdError) {
        console.error(
          `Error converting activeConversationId '${activeConversationId}' to ObjectId for user ${userId}:`,
          objIdError
        );
      }
    }

    const conversationsWithUnseenLastMessage = await Conversation.countDocuments({
      $and: baseQueryConditions,
    });

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
    const currentUserBlockingData = await User.findById(userIdObj)
      .select("blockedUsers blockedBy")
      .lean();
    const blockedByMe =
      currentUserBlockingData?.blockedUsers?.map((id) => id.toString()) || [];
    const blockedMe =
      currentUserBlockingData?.blockedBy?.map((id) => id.toString()) || [];
    const blockedAndBlockingUsers = [...new Set([...blockedByMe, ...blockedMe])];

    const unreadNotificationsCount = await Notification.countDocuments({
      to: userIdObj,
      read: false,
      from: {
        $nin: blockedAndBlockingUsers.map((id) => new mongoose.Types.ObjectId(id)),
      },
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
  commentId = null,
  parentCommentId = null,
}) => {
  try {
    if (from.toString() === to.toString()) {
      return;
    }

    const blocked = await isBlockedOrBlockedBy(from, to);
    if (blocked) {
      console.log(
        `Notification from ${from} to ${to} of type ${type} blocked due to existing block relationship.`
      );
      return;
    }

    const newNotification = new Notification({
      from,
      to,
      type,
      postId,
      commentId,
      parentCommentId,
    });
    await newNotification.save();

    await newNotification.populate({
      path: "from",
      select: "username fullName profileImg",
    });
    if (postId) {
      await newNotification.populate({
        path: "postId",
        select: "text img user",
      });
    }
    if (commentId && newNotification.type !== "commentReply") {
      await newNotification.populate({
        path: "commentId",
        select: "text user",
      });
    }
    if (parentCommentId && newNotification.type === "commentReply") {
      await newNotification.populate({
        path: "parentCommentId",
        select: "text user",
      });
    }

    const receiverSocketIds = getReceiverSocketIds(to.toString());
    receiverSocketIds.forEach((socketId) => {
      io.to(socketId).emit("newNotification", newNotification);
      console.log(
        `Real-time notification sent to ${to.toString()} (socket: ${socketId}) for type ${type}`
      );
    });

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
    socket.disconnect(true);
    return;
  }

  io.emit("getOnlineUsers", getOnlineUserIds());
  console.log("Updated online user IDs after connection:", getOnlineUserIds());

  socket.on("typing", async ({ conversationId }) => {
    const senderId = socket.userId;
    if (!conversationId || !senderId) return;

    if (!typingUsersInConversation.has(conversationId)) {
      typingUsersInConversation.set(conversationId, new Set());
    }
    const typingUsers = typingUsersInConversation.get(conversationId);

    if (!typingUsers.has(senderId)) {
      typingUsers.add(senderId);

      try {
        const conversation = await Conversation.findById(conversationId).select(
          "participants"
        );
        if (conversation) {
          const participantIds = conversation.participants.map((p) => p.toString());
          for (const participantId of participantIds) {
            if (participantId.toString() === senderId.toString()) continue;

            const blocked = await isBlockedOrBlockedBy(senderId, participantId);
            if (!blocked) {
              const receiverSocketIds = getReceiverSocketIds(participantId);
              receiverSocketIds.forEach((sockId) => {
                io.to(sockId).emit("typing", { conversationId, userId: senderId });
              });
            } else {
              console.log(`Typing status from ${senderId} to ${participantId} blocked.`);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching conversation for typing status:", err);
      }
    }
  });

  socket.on("stopTyping", async ({ conversationId }) => {
    const senderId = socket.userId;
    if (!conversationId || !senderId) return;

    if (typingUsersInConversation.has(conversationId)) {
      const typingUsers = typingUsersInConversation.get(conversationId);
      if (typingUsers.has(senderId)) {
        typingUsers.delete(senderId);
        if (typingUsers.size === 0) {
          typingUsersInConversation.delete(conversationId);
        }

        try {
          const conversation = await Conversation.findById(conversationId).select(
            "participants"
          );
          if (conversation) {
            const participantIds = conversation.participants.map((p) => p.toString());
            for (const participantId of participantIds) {
              if (participantId.toString() === senderId.toString()) continue;

              const blocked = await isBlockedOrBlockedBy(senderId, participantId);
              if (!blocked) {
                const receiverSocketIds = getReceiverSocketIds(participantId);
                receiverSocketIds.forEach((sockId) => {
                  io.to(sockId).emit("stopTyping", { conversationId, userId: senderId });
                });
              } else {
                console.log(
                  `Stop typing status from ${senderId} to ${participantId} blocked.`
                );
              }
            }
          }
        } catch (err) {
          console.error("Error fetching conversation for stop typing status:", err);
        }
      }
    }
  });

  socket.on("markMessagesAsSeen", async ({ conversationId }) => {
    try {
      const readerId = socket.userId;

      const conversationObjectId = new mongoose.Types.ObjectId(conversationId);
      const readerObjectId = new mongoose.Types.ObjectId(readerId);

      const conversation = await Conversation.findById(conversationObjectId).select(
        "participants"
      );
      if (!conversation) {
        return console.error("Conversation not found for marking messages as seen.");
      }
      const otherParticipantId = conversation.participants.find(
        (pId) => pId.toString() !== readerId.toString()
      );

      if (
        otherParticipantId &&
        (await isBlockedOrBlockedBy(readerId, otherParticipantId))
      ) {
        console.log(
          `Messages in conversation ${conversationId} not marked as seen for ${readerId} due to blocking.`
        );
      }

      await Message.updateMany(
        {
          conversationId: conversationObjectId,
          sender: { $ne: readerObjectId },
          seen: false,
        },
        { $set: { seen: true } }
      );
      await Conversation.updateOne(
        {
          _id: conversationObjectId,
          lastMessage: { $ne: null },
          "lastMessage.sender": { $ne: readerObjectId },
          "lastMessage.seen": false, // Only update if it's currently unseen
        },
        { $set: { "lastMessage.seen": true } },
        { timestamps: false }
      );

      if (conversation) {
        const otherParticipantIdString = conversation.participants
          .find((pId) => pId.toString() !== readerId.toString())
          ?.toString();

        if (otherParticipantIdString) {
          const recipientSocketIds = getReceiverSocketIds(otherParticipantIdString);
          recipientSocketIds.forEach((sockId) => {
            // Emit to the *sender* of the messages that *their* messages have been seen.
            io.to(sockId).emit("messagesSeen", { conversationId, readerId });
          });
          // You might want to consider the context of emitUnreadMessageStatus
          // Does it need to be a nextTick?
          process.nextTick(async () => {
            await emitUnreadMessageStatus(otherParticipantIdString); // Update unread status for the other participant
          });
        }
        // This emitUnreadMessageStatus for the readerId seems redundant here
        // if the client is already in the conversation and marking them as seen.
        // It might be better handled when conversation list is fetched or on focus.
        process.nextTick(async () => {
          await emitUnreadMessageStatus(readerId); // Update unread status for the reader
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

        typingUsersInConversation.forEach(async (typingUsers, convId) => {
          if (typingUsers.has(disconnectedUserId)) {
            typingUsers.delete(disconnectedUserId);
            if (typingUsers.size === 0) {
              typingUsersInConversation.delete(convId);
            }
            try {
              const conversation = await Conversation.findById(convId).select(
                "participants"
              );
              if (conversation) {
                const participantIds = conversation.participants.map((p) => p.toString());
                for (const participantId of participantIds) {
                  if (participantId.toString() === disconnectedUserId.toString())
                    continue;

                  const blocked = await isBlockedOrBlockedBy(
                    disconnectedUserId,
                    participantId
                  );
                  if (!blocked) {
                    const receiverSocketIds = getReceiverSocketIds(
                      participantId.toString()
                    );
                    receiverSocketIds.forEach((sockId) => {
                      io.to(sockId).emit("stopTyping", {
                        conversationId: convId,
                        userId: disconnectedUserId,
                      });
                    });
                  } else {
                    console.log(
                      `Disconnect stop typing from ${disconnectedUserId} to ${participantId} blocked.`
                    );
                  }
                }
              }
            } catch (err) {
              console.error(
                "Error fetching conversation for disconnect stop typing:",
                err
              );
            }
          }
        });
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
