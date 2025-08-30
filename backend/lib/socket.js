import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";
import mongoose from "mongoose";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import PublicChatMessage from "../models/publicMessage.model.js";
import Post from "../models/post.model.js";
import { sendPushNotification } from "./utils/sendPush.js";
import {
  getDynamicPushBody,
  getDynamicPushTitle,
  getDynamicPushUrl,
} from "./utils/helpers.js";

const BASE_URL = process.env.RENDER_EXTERNAL_URL || "http://localhost:5000";

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.RENDER_EXTERNAL_URL,
];

export const userLastActive = new Map();
export const userActiveChats = new Map();
const typingUsersInConversation = new Map();
export const activePublicChatUsers = new Set();
const publicChatTypingUsers = new Map();
export const onlineUsersMap = new Map();
const socketUserMap = new Map();

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

  const [currentUser, targetUser] = await User.find({
    _id: { $in: [currentUserId, targetUserId] },
  })
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

    const user = await User.findById(userIdObj).select("blockedUsers blockedBy").lean();
    const blockedUserIds = [
      ...(user?.blockedUsers?.map((id) => id.toString()) || []),
      ...(user?.blockedBy?.map((id) => id.toString()) || []),
    ];
    const blockedUserObjectIds = [...new Set(blockedUserIds)].map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const conversations = await Conversation.find({
      participants: userIdObj,
      hiddenFor: { $ne: userIdObj },
    }).select("participants");

    const eligibleConversationIds = conversations
      .filter((conv) => {
        const otherParticipant = conv.participants.find((p) => p && !p.equals(userIdObj));
        return (
          otherParticipant &&
          !blockedUserObjectIds.some((blockedId) => blockedId.equals(otherParticipant))
        );
      })
      .map((conv) => conv._id);

    const activeConversationId = userActiveChats.get(userId.toString());
    if (activeConversationId) {
      const index = eligibleConversationIds.findIndex(
        (id) => id.toString() === activeConversationId
      );
      if (index > -1) {
        eligibleConversationIds.splice(index, 1);
      }
    }

    const unreadMessageCount = await Message.countDocuments({
      conversationId: { $in: eligibleConversationIds },
      sender: { $ne: userIdObj },
      seen: false,
    });

    const recipientSocketIds = getReceiverSocketIds(userId);

    if (recipientSocketIds.length > 0) {
      io.to(recipientSocketIds).emit("unreadMessageStatus", { unreadMessageCount });
    }
  } catch (error) {
    console.error(`Error in emitUnreadMessageStatus for user ${userId}:`, error);
  }
}

export async function emitNewPostCount(userId) {
  try {
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const recipientSocketIds = getReceiverSocketIds(userId);

    const user = await User.findById(userIdObj).select("lastReadFeedTimestamp").lean();

    if (!user) {
      console.warn(`User ${userId} not found for emitNewPostCount.`);
      return;
    }

    // Use epoch if lastReadFeedTimestamp is null or undefined
    const lastReadTimestamp = user.lastReadFeedTimestamp || new Date(0);

    const newPostCount = await Post.countDocuments({
      user: { $ne: userIdObj },
      isScheduled: false,
      publishedAt: { $gt: lastReadTimestamp },
      isVent: { $ne: true },
    });

    recipientSocketIds.forEach((socketId) => {
      io.to(socketId).emit("newPostCount", { newPostCount });
    });
  } catch (error) {
    console.error(`Unhandled error in emitNewPostCount for user ${userId}:`, error);
  }
}


export async function emitNewVentPostCount(userId) {
  try {
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const recipientSocketIds = getReceiverSocketIds(userId);

    const user = await User.findById(userIdObj).select("lastReadVentFeedTimestamp").lean();

    if (!user) {
      console.warn(`User ${userId} not found for emitNewVentPostCount.`);
      return;
    }

    const lastReadTimestamp = user.lastReadVentFeedTimestamp || new Date(0);

    const newVentPostCount = await Post.countDocuments({
      user: { $ne: userIdObj }, // Do not count the user's own posts
      isScheduled: false,
      publishedAt: { $gt: lastReadTimestamp },
      isVent: true, // Only count vent posts
    });

    recipientSocketIds.forEach((socketId) => {
      io.to(socketId).emit("newVentPostCount", { newVentPostCount });
    });
  } catch (error) {
    console.error(`Unhandled error in emitNewVentPostCount for user ${userId}:`, error);
  }
}

export async function emitUnreadPublicChatStatus(userId) {
  try {
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const recipientSocketIds = getReceiverSocketIds(userId);

    // If the user is currently in the public chat, their count should be 0.
    if (activePublicChatUsers.has(userId)) {
      recipientSocketIds.forEach((socketId) => {
        io.to(socketId).emit("unreadPublicChatStatus", { unreadPublicChatCount: 0 }); // Emit 0 count
      });
      return; // Crucially, stop here if the user is active in the chat
    }

    const user = await User.findById(userIdObj)
      .select("lastReadPublicChatTimestamp isBannedInPublicChat") // Select isBannedInPublicChat too
      .lean();

    // If user is banned, they shouldn't receive notifications/counts for public chat.
    if (!user || user.isBannedInPublicChat) {
      recipientSocketIds.forEach((socketId) => {
        io.to(socketId).emit("unreadPublicChatStatus", { unreadPublicChatCount: 0 });
      });
      return;
    }

    // Determine the cutoff for unread messages
    const lastReadTimestamp = user.lastReadPublicChatTimestamp || new Date(0); // Use epoch if never read

    // Count messages created *after* the user's lastReadPublicChatTimestamp,
    // and not sent by the user themselves.
    const unreadPublicChatCount = await PublicChatMessage.countDocuments({
      createdAt: { $gt: lastReadTimestamp },
      sender: { $ne: userIdObj }, // Exclude messages sent by the current user
    });

    recipientSocketIds.forEach((socketId) => {
      // CHANGE HERE: Emit the count instead of a boolean
      io.to(socketId).emit("unreadPublicChatStatus", { unreadPublicChatCount });
    });
  } catch (error) {
    console.error(
      `Unhandled error in emitUnreadPublicChatStatus for user ${userId}:`,
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

    // const hasUnreadNotifications = unreadNotificationsCount > 0;

    const recipientSocketIds = getReceiverSocketIds(userId);

    recipientSocketIds.forEach((socketId) => {
      io.to(socketId).emit("unreadNotificationStatus", { unreadNotificationsCount });
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
  isAnonymousInteraction = false,
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
      isAnonymousInteraction,
    });
    await newNotification.save();

    await newNotification.populate({
      path: "from",
      select: "username fullName",
      populate: {
        path: "profileImg",
        select: "imageUrl",
      },
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
        select: "text user img",
      });
    }
    if (parentCommentId && type === "commentReply") {
      await newNotification.populate({
        path: "parentCommentId",
        select: "text user img",
      });
    }

    if (isAnonymousInteraction) {
      newNotification.from.username = "Anonymous";
      newNotification.from.fullName = "Anonymous";
      newNotification.from.profileImg = { imageUrl: "/avatar-placeholder.png" };
    }

    const receiverSocketIds = getReceiverSocketIds(to.toString());

    if (receiverSocketIds.length === 0) {
      const fromUser = await User.findById(from).select("username").lean();
      const username = fromUser ? fromUser.username : "A user";

      let postOwnerUsername = null;
      if (postId) {
        const post = await Post.findById(postId).populate("user", "username").lean();
        if (post && post.user) {
          postOwnerUsername = post.user.username;
        }
      }

      const dynamicBody = getDynamicPushBody(type, username);
      const dynamicTitle = getDynamicPushTitle(type);
      const dynamicUrl = getDynamicPushUrl(type, postOwnerUsername, postId, username);

      const payload = {
        title: dynamicTitle,
        body: dynamicBody,
        url: dynamicUrl,
        icon: `${BASE_URL}/klaynelogo.png`,
      };
      await sendPushNotification(to.toString(), payload);
    }

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

    userLastActive.set(userId, Date.now());

    try {
      const user = await User.findById(userId)
        .select("isBannedInPublicChat username")
        .lean();

      const username = user ? user.username : "Unknown User";

      socketUserMap.set(socket.id, { userId, username });

      if (!onlineUsersMap.has(userId)) {
        onlineUsersMap.set(userId, new Set());
      }
      onlineUsersMap.get(userId).add(socket.id);

      console.log(`User connected: ${username} - ${userId}`);

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
    await emitUnreadPublicChatStatus(userId); // <--- CALL NEW FUNCTION HERE
  } else {
    socket.disconnect(true);
    return;
  }

  io.emit("getOnlineUsers", getOnlineUserIds());

  socket.on("heartbeat", () => {
    if (socket.userId) {
      userLastActive.set(socket.userId, Date.now());
    }
  });

  // --- END PUBLIC CHAT TYPING EVENTS --
  socket.on("joinConversation", (conversationId) => {
    if (conversationId) {
      // Basic validation
      socket.join(conversationId);
      // console.log(
      //   `Socket ${socket.id} (User ${socket.userId}) joined private conversation room: ${conversationId}`
      // );
    }
  });

  socket.on("leaveConversation", (conversationId) => {
    if (conversationId) {
      socket.leave(conversationId);
      // console.log(
      //   `Socket ${socket.id} (User ${socket.userId}) left private conversation room: ${conversationId}`
      // );
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

      // First, check if there are actually unseen messages to avoid unnecessary updates
      const unseenMessagesCount = await Message.countDocuments({
        conversationId: conversationObjectId,
        sender: { $ne: readerObjectId },
        seen: false,
      });

      if (unseenMessagesCount === 0) {
        return; // No unseen messages, no need to proceed
      }

      // Use a transaction to ensure consistency
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          // Update all individual messages as seen
          await Message.updateMany(
            {
              conversationId: conversationObjectId,
              sender: { $ne: readerObjectId },
              seen: false,
            },
            { $set: { seen: true } },
            { session }
          );

          // Update the conversation's lastMessage.seen only if it was sent by the other user
          await Conversation.updateOne(
            {
              _id: conversationObjectId,
              "lastMessage.sender": { $ne: readerObjectId },
              "lastMessage.seen": false,
            },
            { $set: { "lastMessage.seen": true } },
            { timestamps: false, session }
          );
        });
      } finally {
        await session.endSession();
      }

      // Fetch the updated conversation once after the transaction
      const updatedConversation = await Conversation.findById(conversationObjectId)
        .populate({
          path: "participants",
          select: "username fullName isVerified isGoldVerified badges",
          populate: {
            path: "profileImg",
            select: "imageUrl",
          },
        })
        .populate({
          path: "lastMessage.sender",
          select: "username fullName isVerified isGoldVerified badges",
          populate: {
            path: "profileImg",
            select: "imageUrl",
          },
        });

      if (updatedConversation) {
        // Emit to all participants
        updatedConversation.participants.forEach((participant) => {
          const participantSocketIds = getReceiverSocketIds(participant._id.toString());
          if (participantSocketIds.length > 0) {
            io.to(participantSocketIds).emit("conversationUpdated", updatedConversation);
          }
        });

        // Emit messagesSeen event to the sender only
        const otherParticipantId = updatedConversation.participants.find(
          (pId) => pId._id.toString() !== readerId.toString()
        );

        if (otherParticipantId) {
          const senderSocketIds = getReceiverSocketIds(otherParticipantId._id.toString());
          if (senderSocketIds.length > 0) {
            io.to(senderSocketIds).emit("messagesSeen", {
              conversationId,
              readerId,
              messageCount: unseenMessagesCount,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error marking messages as seen (socket):", error);
    }
  });

  socket.on("userActiveInChat", ({ conversationId }) => {
    userActiveChats.set(userId, conversationId ? conversationId.toString() : null);
    emitUnreadMessageStatus(userId);
  });

  socket.on("userEnteredPublicChat", async () => {
    if (!socket.userId) return; // Ensure userId is set

    activePublicChatUsers.add(socket.userId);
    // console.log(`User ${socket.userId} entered public chat.`);

    // Immediately mark public chat as read for this user
    try {
      const latestPublicMessage = await PublicChatMessage.findOne()
        .sort({ createdAt: -1 })
        .lean();
      if (latestPublicMessage) {
        await User.findByIdAndUpdate(
          socket.userId,
          { $set: { lastReadPublicChatTimestamp: latestPublicMessage.createdAt } },
          { new: true }
        );
      } else {
        // If no messages yet, just set to current time
        await User.findByIdAndUpdate(
          socket.userId,
          { $set: { lastReadPublicChatTimestamp: new Date() } },
          { new: true }
        );
      }
      // After marking as read, emit false to ensure no red dot appears
      emitUnreadPublicChatStatus(socket.userId);
    } catch (error) {
      console.error(
        `Error marking public chat as read on "userEnteredPublicChat" for user ${socket.userId}:`,
        error
      );
    }
  });

  socket.on("userLeftPublicChat", () => {
    if (!socket.userId) return; // Ensure userId is set
    activePublicChatUsers.delete(socket.userId);
    // console.log(`User ${socket.userId} left public chat.`);
  });

  socket.on("public_typing", async ({ isEditing }) => {
    if (!socket.userId || socket.isBannedInPublicChat) return;

    try {
      let userUsername;

      // Option 1: Store username on socket during connection/login (Recommended)
      if (socket.username) {
        userUsername = socket.username;
      } else {
        // Fallback: Fetch if not already on socket, but avoid for every event.
        // This part should ideally be optimized out if username is set on connect.
        const user = await User.findById(socket.userId).select("username").lean();
        if (!user) return;
        userUsername = user.username;
        socket.username = user.username; // Cache it on the socket for future events
      }

      // Always update the user's typing status in the map
      // This is crucial: if a user is already typing, their 'isEditing' status needs to be updated.
      // And even if just typing, refreshing their presence in the map (and thus the timestamp if you add it)
      // is good for keeping track of active typers.
      publicChatTypingUsers.set(socket.userId, {
        username: userUsername,
        isEditing: isEditing,
        timestamp: Date.now(), // Add a timestamp for potential inactivity cleanup
      });

      // Emit the *updated* list of all current typing users to everyone
      // This simplifies client-side state management significantly.
      // Instead of sending individual start/stop, send the full current list.
      const typingUsersArray = Array.from(publicChatTypingUsers.entries()).map(
        ([userId, data]) => ({
          userId,
          username: data.username,
          isEditing: data.isEditing,
        })
      );
      socket.to(PUBLIC_CHAT_ROOM).emit("public_typing_update", {
        typingUsers: typingUsersArray,
      });
      // You could also emit to the sender to confirm their status, if needed.
      // socket.emit("public_typing_update", { typingUsers: typingUsersArray });
    } catch (error) {
      console.error("Error handling public_typing event:", error);
    }
  });

  socket.on("public_stop_typing", () => {
    if (!socket.userId || socket.isBannedInPublicChat) return;

    // Remove the user from the typing map
    if (publicChatTypingUsers.has(socket.userId)) {
      publicChatTypingUsers.delete(socket.userId);
    }

    // Emit the *updated* list of all current typing users after one stops
    const typingUsersArray = Array.from(publicChatTypingUsers.entries()).map(
      ([userId, data]) => ({
        userId,
        username: data.username,
        isEditing: data.isEditing,
      })
    );
    socket.to(PUBLIC_CHAT_ROOM).emit("public_typing_update", {
      typingUsers: typingUsersArray,
    });
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

  socket.on("disconnect", () => {
    const disconnectedUserId = socket.userId;

    const userInfo = socketUserMap.get(socket.id);
    const username = userInfo?.username || "Unknown User";
    const userId = userInfo?.userId;

    console.log(`User disconnected: ${username} - ${userId}`);

    if (!disconnectedUserId) {
      return;
    }

    const wasActiveInChat = userActiveChats.has(disconnectedUserId.toString());
    const activeConversationId = userActiveChats.get(disconnectedUserId.toString());

    activePublicChatUsers.delete(disconnectedUserId);
    userActiveChats.delete(disconnectedUserId.toString());

    if (publicChatTypingUsers.has(disconnectedUserId)) {
      publicChatTypingUsers.delete(disconnectedUserId);
      io.to(PUBLIC_CHAT_ROOM).emit("public_typing_update", {
        typingUsers: Array.from(publicChatTypingUsers.values()),
      });
    }

    const userSockets = onlineUsersMap.get(disconnectedUserId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        onlineUsersMap.delete(disconnectedUserId);

        typingUsersInConversation.forEach((typingUsers, convId) => {
          if (typingUsers.has(disconnectedUserId)) {
            typingUsers.delete(disconnectedUserId);
          }
        });

        if (wasActiveInChat && activeConversationId) {
          emitUnreadMessageStatus(disconnectedUserId);
        }
      }
    }

    io.emit("getOnlineUsers", getOnlineUserIds());
  });
});

const CHECK_INTERVAL = 60 * 1000; // Check every 1 minute
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes of inactivity

setInterval(() => {
  const now = Date.now();
  const usersToRemove = [];

  for (const [userId, lastActive] of userLastActive.entries()) {
    if (now - lastActive > INACTIVITY_TIMEOUT) {
      // Clean up the user from all online maps
      onlineUsersMap.delete(userId);
      userLastActive.delete(userId);
      activePublicChatUsers.delete(userId);

      // Add them to a list for cleanup
      usersToRemove.push(userId);
    }
  }

  if (usersToRemove.length > 0) {
    // Broadcast the updated online users list
    io.emit("getOnlineUsers", getOnlineUserIds());
  }
}, CHECK_INTERVAL);

export { io, server, app };
