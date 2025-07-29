import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";
import mongoose from "mongoose";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import PublicChatMessage from "../models/publicMessage.model.js";

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.RENDER_EXTERNAL_URL,
];

export const userActiveChats = new Map();
const typingUsersInConversation = new Map();
export const activePublicChatUsers = new Set(); // userId
const publicChatTypingUsers = new Map(); // To track who is typing in public chat

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
    const activeConversationId = userActiveChats.get(userId.toString());
    let activeConversationIdObj = null;

    const currentUserBlockingData = await User.findById(userIdObj)
      .select("blockedUsers blockedBy")
      .lean();

    const blockedByMe =
      currentUserBlockingData?.blockedUsers?.map((id) => id.toString()) || [];
    const blockedMe =
      currentUserBlockingData?.blockedBy?.map((id) => id.toString()) || [];
    const blockedAndBlockingUserIds = [...new Set([...blockedByMe, ...blockedMe])];

    // Convert blockedAndBlockingUserIds to ObjectIds for the query
    const blockedAndBlockingObjectIds = blockedAndBlockingUserIds.map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    // --- STEP 1: Find eligible conversations that are not hidden and not with blocked users ---
    const eligibleConversations = await Conversation.find({
      participants: userIdObj,
      hiddenFor: { $ne: userIdObj },
      // Filter out conversations where *any* participant is blocked/blocking
      // This requires checking both participants in a two-person chat.
      // A more robust way might be to filter later if performance is an issue,
      // but for accuracy, this is important.
      participants: { $nin: blockedAndBlockingObjectIds },
    }).select("_id"); // Only retrieve conversation IDs

    const eligibleConversationIds = eligibleConversations.map((conv) => conv._id);

    // If the user is currently active in a specific conversation, exclude it from the count
    if (activeConversationId) {
      try {
        activeConversationIdObj = new mongoose.Types.ObjectId(activeConversationId);
        // Remove the active conversation from the list of eligible IDs
        const index = eligibleConversationIds.findIndex((id) =>
          id.equals(activeConversationIdObj)
        );
        if (index > -1) {
          eligibleConversationIds.splice(index, 1);
        }
      } catch (objIdError) {
        console.error(
          `Error converting activeConversationId '${activeConversationId}' to ObjectId for user ${userId}:`,
          objIdError
        );
      }
    }

    // --- STEP 2: Count unread messages within the eligible conversations ---
    // Count messages where:
    // 1. The message is for an eligible conversation
    // 2. The message was sent by someone other than the current user (the receiver)
    // 3. The message has not been seen by the current user
    const unreadMessageCount = await Message.countDocuments({
      conversationId: { $in: eligibleConversationIds },
      sender: { $ne: userIdObj }, // Message sent by the other person
      seen: false, // Not yet seen by the receiver
      text: { $exists: true, $ne: "" }, // Ensure it's a valid message (not just an empty placeholder)
    });

    const recipientSocketIds = getReceiverSocketIds(userId);
    recipientSocketIds.forEach((socketId) => {
      io.to(socketId).emit("unreadMessageStatus", { unreadMessageCount });
    });
  } catch (error) {
    console.error(
      `Unhandled error in emitUnreadMessageStatus for user ${userId}:`,
      error
    );
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
  // console.log(`Socket connected: ${socket.id}`);
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

  socket.on("joinConversation", (conversationId) => {
    if (conversationId) {
      // Basic validation
      socket.join(conversationId);
      // console.log(
      //   `Socket ${socket.id} (User ${socket.userId}) joined private conversation room: ${conversationId}`
      // );
    }
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
  // --- END PUBLIC CHAT TYPING EVENTS --

  socket.on("leaveConversation", (conversationId) => {
    if (conversationId) {
      // Basic validation
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

      // Update the last message in the conversation if it was sent by the other user and is currently unseen
      const conversationUpdateResult = await Conversation.updateOne(
        {
          _id: conversationObjectId,
          "lastMessage.sender": { $ne: readerObjectId },
          "lastMessage.seen": false,
        },
        { $set: { "lastMessage.seen": true } },
        { timestamps: false } // Don't bump the `updatedAt` timestamp just for a 'seen' update
      );

      // Also mark all individual messages as seen
      await Message.updateMany(
        {
          conversationId: conversationObjectId,
          sender: { $ne: readerObjectId },
          seen: false,
        },
        { $set: { seen: true } }
      );

      // --- CORE FIX: If the conversation's lastMessage was updated, fetch and emit it ---
      if (conversationUpdateResult.modifiedCount > 0) {
        // Fetch the now-updated conversation with populated details
        const updatedConversation = await Conversation.findById(conversationObjectId)
          .populate(
            "participants",
            "username profileImg fullName isVerified isGoldVerified"
          )
          .populate(
            "lastMessage.sender",
            "username profileImg fullName isVerified isGoldVerified"
          );

        if (updatedConversation) {
          // Emit the full conversation object to all participants so their UI (sidebar) updates
          updatedConversation.participants.forEach((participant) => {
            const participantSocketIds = getReceiverSocketIds(participant._id.toString());
            io.to(participantSocketIds).emit("conversationUpdated", updatedConversation);
          });
        }
      }

      // You can still emit messagesSeen for the sender of the original message
      const initialConversation = await Conversation.findById(
        conversationObjectId
      ).select("participants");
      if (initialConversation) {
        const otherParticipantId = initialConversation.participants.find(
          (pId) => pId.toString() !== readerId.toString()
        );
        if (otherParticipantId) {
          const senderSocketIds = getReceiverSocketIds(otherParticipantId.toString());
          io.to(senderSocketIds).emit("messagesSeen", { conversationId, readerId });
        }
      }
    } catch (error) {
      console.error("Error marking messages as seen (socket):", error);
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

    // --- FIX START: Handle public chat typing on disconnect ---
    if (disconnectedUserId) {
      // --- Crucial: Notify public chat users that this user has stopped typing ---
      if (publicChatTypingUsers.has(disconnectedUserId)) {
        publicChatTypingUsers.delete(disconnectedUserId); // Remove from server-side tracking
        io.to(PUBLIC_CHAT_ROOM).emit("public_stop_typing", {
          userId: disconnectedUserId,
        });
      }
      activePublicChatUsers.delete(disconnectedUserId); // This is separate for presence, keep it.

      // ... rest of existing disconnect logic for onlineUsersMap and private chat typing
      if (onlineUsersMap.has(disconnectedUserId)) {
        const userSockets = onlineUsersMap.get(disconnectedUserId);
        userSockets.delete(socket.id);

        if (userSockets.size === 0) {
          onlineUsersMap.delete(disconnectedUserId);
          // ... (your existing private chat typing cleanup on disconnect) ...
        }
      }
    }

    if (disconnectedUserId && onlineUsersMap.has(disconnectedUserId)) {
      const userSockets = onlineUsersMap.get(disconnectedUserId);
      userSockets.delete(socket.id);
      activePublicChatUsers.delete(disconnectedUserId);

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
