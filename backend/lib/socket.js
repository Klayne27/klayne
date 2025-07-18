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
    transports: ["websocket", "polling"],
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
    if (commentId && type !== "commentReply") {
      await newNotification.populate({
        path: "commentId",
        select: "text user",
      });
    }
    if (parentCommentId && type === "commentReply") {
      await newNotification.populate({
        path: "parentCommentId",
        select: "text user",
      });
    }

    const receiverSocketIds = getReceiverSocketIds(to.toString());
    receiverSocketIds.forEach((socketId) => {
      io.to(socketId).emit("newNotification", newNotification);
    });

    await emitUnreadNotificationStatus(to.toString());
  } catch (error) {
    console.error("Error in createAndSendNotification (socket.js): ", error.message);
  }
};

export const PUBLIC_CHAT_ROOM = "public_chat_room";

io.on("connection", async (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  const userId = socket.handshake.query.userId;

  console.log(`User ${userId} (${socket.id}) joined room ${PUBLIC_CHAT_ROOM}`);

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

    // --- MODIFICATION START ---

    // Check ban status on connection for public chat
    try {
      const user = await User.findById(userId).select("isBannedInPublicChat").lean();
      if (user && user.isBannedInPublicChat) {
        socket.isBannedInPublicChat = true; // Attach flag to socket for easier checks
        // Do NOT join PUBLIC_CHAT_ROOM if banned

        // Immediately notify the client that they are banned (for UI purposes)
        io.to(socket.id).emit("bannedFromPublicChat", {
          isBanned: true,
          // message: "You are currently banned from the public chat.",
        });
      } else {
        socket.isBannedInPublicChat = false;
        socket.join(PUBLIC_CHAT_ROOM); // Allow to join if not banned
        console.log(`User ${userId} (${socket.id}) joined room ${PUBLIC_CHAT_ROOM}`);
        // Also send a status to indicate they are NOT banned, in case they were previously
        io.to(socket.id).emit("bannedFromPublicChat", { isBanned: false });
      }
    } catch (err) {
      console.error("Error checking user ban status on connection:", err);
      // Fallback: If error, disconnect to prevent unintended access
      socket.disconnect(true);
      return;
    }
    // --- MODIFICATION END ---

    emitUnreadMessageStatus(userId);
    emitUnreadNotificationStatus(userId);
  } else {
    socket.disconnect(true);
    return;
  }

  io.emit("getOnlineUsers", getOnlineUserIds());

  // --- NEW: Handle direct 'joinPublicChat' event (if client explicitly sends it) ---
  socket.on("joinPublicChat", async () => {
    // Re-check ban status if user explicitly tries to join later
    try {
      const user = await User.findById(socket.userId)
        .select("isBannedInPublicChat")
        .lean();
      if (user && user.isBannedInPublicChat) {
        socket.isBannedInPublicChat = true;
        socket.leave(PUBLIC_CHAT_ROOM); // Ensure they are not in the room
        io.to(socket.id).emit("bannedFromPublicChat", {
          isBanned: true,
          // message: "You are currently banned from the public chat.",
        });
      } else {
        socket.isBannedInPublicChat = false;
        socket.join(PUBLIC_CHAT_ROOM);
        io.to(socket.id).emit("bannedFromPublicChat", { isBanned: false });
      }
    } catch (err) {
      console.error("Error handling joinPublicChat event:", err);
    }
  });

  // --- NEW: Listen for 'userBanned' and 'userUnbanned' events from admin actions ---
  // These are meant for the *specific user being banned/unbanned* to update their status immediately.
  // socket.on("userBanned", ({ userId, username }) => {
  //   console.log(
  //     `User ${userId} (${username}) was just banned and removed from public chat room.`
  //   );

  //   // This event name matches your controller emit
  //   if (socket.userId === userId.toString()) {
  //     socket.isBannedInPublicChat = true;
  //     socket.leave(PUBLIC_CHAT_ROOM); // Immediately remove them from the room
  //     io.to(socket.id).emit("bannedFromPublicChat", {
  //       isBanned: true,
  //       // message: `You have been banned from the public chat.`,
  //     });
  //     console.log(
  //       `User ${userId} (${username}) was just banned and removed from public chat room.`
  //     );
  //   }
  // });

  // socket.on("userUnbanned", ({ userId, username }) => {
  //       console.log(
  //         `User ${userId} (${username}) was just unbanned and allowed to join public chat room.`
  //       );
  //   // This event name matches your controller emit
  //   if (socket.userId === userId.toString()) {
  //     socket.isBannedInPublicChat = false;
  //     socket.join(PUBLIC_CHAT_ROOM); // Allow them to rejoin the room
  //     io.to(socket.id).emit("bannedFromPublicChat", {
  //       isBanned: false,
  //       // message: `You have been unbanned from the public chat.`,
  //     });
  //     console.log(
  //       `User ${userId} (${username}) was just unbanned and allowed to join public chat room.`
  //     );
  //   }
  // });
  // --- END NEW ---

  socket.on("joinConversation", (conversationId) => {
    if (conversationId) {
      // Basic validation
      socket.join(conversationId);
      console.log(
        `Socket ${socket.id} (User ${socket.userId}) joined private conversation room: ${conversationId}`
      );
    }
  });

  socket.on("leaveConversation", (conversationId) => {
    if (conversationId) {
      // Basic validation
      socket.leave(conversationId);
      console.log(
        `Socket ${socket.id} (User ${socket.userId}) left private conversation room: ${conversationId}`
      );
    }
  });

  socket.on("typing", async ({ conversationId, isEditing }) => {
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
                io.to(sockId).emit("typing", {
                  conversationId,
                  userId: senderId,
                  isEditing,
                });
              });
            }
          }
        }
      } catch (err) {
        console.error("Error fetching conversation for typing status:", err);
      }
    }
  });

  socket.on("stopTyping", async ({ conversationId, isEditing }) => {
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
                  io.to(sockId).emit("stopTyping", {
                    conversationId,
                    userId: senderId,
                    isEditing,
                  });
                });
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

        // process.nextTick(async () => {
        //   await emitUnreadMessageStatus(readerId); // Update unread status for the reader
        // });
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

    socket.leave(PUBLIC_CHAT_ROOM);

    const disconnectedUserId = socket.userId;

    if (disconnectedUserId && onlineUsersMap.has(disconnectedUserId)) {
      const userSockets = onlineUsersMap.get(disconnectedUserId);
      userSockets.delete(socket.id);

      if (userSockets.size === 0) {
        onlineUsersMap.delete(disconnectedUserId);

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
      }
    } else {
      console.warn(
        `Disconnected socket ${socket.id} had no associated valid userId in map or was already removed.`
      );
    }

    io.emit("getOnlineUsers", getOnlineUserIds());
  });
});

export { io, server, app };
