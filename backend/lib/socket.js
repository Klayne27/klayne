import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";
import Conversation from "../models/conversation.model.js";
import mongoose from "mongoose"; // Import mongoose to use ObjectId

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    process.env.RENDER_EXTERNAL_URL,
];

const userActiveChats = new Map(); // Map: userId (string) -> activeConversationId (string or null)


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

const onlineUsersMap = new Map(); // Stores userId -> Set of socketIds

/**
 * Retrieves all socket IDs for a given user.
 * @param {string} userId - The ID of the user.
 * @returns {string[]} An array of socket IDs for the user.
 */
export function getReceiverSocketIds(userId) {
    return onlineUsersMap.has(userId) ? Array.from(onlineUsersMap.get(userId)) : [];
}

/**
 * Gets a list of all currently online user IDs.
 * @returns {string[]} An array of online user IDs.
 */
function getOnlineUserIds() {
    return Array.from(onlineUsersMap.keys()).filter((userId) => {
        const sockets = onlineUsersMap.get(userId);
        return sockets && sockets.size > 0;
    });
}

/**
 * Emits the unread message status to a specific user.
 * This function queries the database to check if the user has any unread messages
 * across all their conversations and then emits a 'unreadMessageStatus' event
 * to all their connected sockets.
 *
 * @param {string} userId - The ID of the user whose unread status needs to be emitted.
 */
export async function emitUnreadMessageStatus(userId) {
  try {
    const userIdObj = new mongoose.Types.ObjectId(userId); // Convert once
    const activeConversationId = userActiveChats.get(userId.toString()); // Get string ID from map
    let activeConversationIdObj = null;

    console.log(`--- Starting emitUnreadMessageStatus for user: ${userId} ---`);
    console.log(`Active conversation ID from map for ${userId}: ${activeConversationId}`);

    const query = {
      participants: userIdObj, // Current user is a participant
      "lastMessage.sender": { $ne: userIdObj }, // Last message sent by someone else
      "lastMessage.seen": false, // Last message not seen by current user
      "lastMessage.text": { $exists: true, $ne: "" }, // Ensure it's a valid message
    };

    if (activeConversationId) {
      try {
        // Safely convert to ObjectId and apply exclusion
        activeConversationIdObj = new mongoose.Types.ObjectId(activeConversationId);
        query._id = { $ne: activeConversationIdObj };
        console.log(
          `Excluding active chat with ObjectId: ${activeConversationIdObj} from query.`
        );
      } catch (objIdError) {
        console.error(
          `Error converting activeConversationId '${activeConversationId}' to ObjectId for user ${userId}:`,
          objIdError
        );
        // If there's an error in conversion, proceed without the exclusion for this call
        // This means the badge might flicker, but at least it won't disappear permanently.
      }
    } else {
      console.log(`No active conversation to exclude for user ${userId}.`);
    }

    // Log the final query object before executing it
    console.log("Final MongoDB Query Object:", JSON.stringify(query, null, 2));

    const conversationsWithUnseenLastMessage = await Conversation.countDocuments(query);

    const hasUnread = conversationsWithUnseenLastMessage > 0;
    console.log(
      `MongoDB count result for user ${userId}: ${conversationsWithUnseenLastMessage} conversations found.`
    );
    console.log(`User ${userId} has unread messages (badge status): ${hasUnread}`);

    const recipientSocketIds = getReceiverSocketIds(userId);
    recipientSocketIds.forEach((socketId) => {
      io.to(socketId).emit("unreadMessageStatus", { hasUnread });
    });
    console.log(`--- Finished emitUnreadMessageStatus for user: ${userId} ---`);
  } catch (error) {
    console.error(
      `Unhandled error in emitUnreadMessageStatus for user ${userId}:`,
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

        console.log(
            `User ${userId} (socket ${socket.id}) connected. Total connections for user: ${
                onlineUsersMap.get(userId).size
            }`
        );

        // Emit initial unread message status for the newly connected user
        emitUnreadMessageStatus(userId);
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
                { _id: conversationId, "lastMessage.sender": { $ne: readerId } }, // Only update if last message wasn't sent by current reader
                { $set: { "lastMessage.seen": true } }
            );

            const conversation = await Conversation.findById(conversationId);

            if (conversation) {
                const otherParticipantId = conversation.participants.find(
                    (pId) => pId.toString() !== readerId.toString()
                );

                // Notify the other participant that messages in this conversation were seen
                if (otherParticipantId) {
                    const recipientSocketIds = getReceiverSocketIds(otherParticipantId.toString());
                    recipientSocketIds.forEach((sockId) => {
                        io.to(sockId).emit("messagesSeen", { conversationId, readerId });
                    });
                    // Emit unread status for the other participant as well (their messages might now be seen)
                    await emitUnreadMessageStatus(otherParticipantId.toString());
                }

                // Emit updated unread status for the current reader
                await emitUnreadMessageStatus(readerId);
            }

            console.log(
                `Messages in conversation ${conversationId} marked as seen by ${readerId}.`
            );
        } catch (error) {
            console.error("Error marking messages as seen:", error);
        }
    });

    socket.on("userActiveInChat", ({ conversationId }) => {
      console.log(`Backend: User ${userId} is now active in chat: ${conversationId}`);
      // Store the active conversation ID for this user
      userActiveChats.set(userId, conversationId ? conversationId.toString() : null);

      // IMPORTANT: After updating the active chat status, immediately re-emit the unread status
      // This ensures the badge updates to reflect the exclusion of the active chat.
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
        console.log("Updated online user IDs after disconnect:", getOnlineUserIds());

        if (userId) {
          // Ensure userId is valid
          console.log(
            `Backend: User ${userId} disconnected. Clearing active chat status.`
          );
          userActiveChats.delete(userId); // Remove user from active chats map
        }
    });
});

export { io, server, app };

