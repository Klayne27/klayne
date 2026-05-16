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
  getBlockingUsers,
  getDynamicPushBody,
  getDynamicPushTitle,
  getDynamicPushUrl,
  getMutedUsers,
  isBlockedOrBlockedBy,
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
export const offlineStatusUsers = new Map(); // Key: userId, Value: true/false
const disconnectTimers = new Map();


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
    return sockets && sockets.size > 0 && !offlineStatusUsers.has(userId);
  });
}

// const isBlockedOrBlockedBy = async (currentUserId, targetUserId) => {
//   if (!currentUserId || !targetUserId) return false;
//   if (currentUserId.toString() === targetUserId.toString()) return false;

//   const [currentUser, targetUser] = await User.find({
//     _id: { $in: [currentUserId, targetUserId] },
//   })
//     .select("blockedUsers blockedBy")
//     .lean();

//   if (!currentUser || !targetUser) return false;

//   const currentUserBlockedTarget = (currentUser.blockedUsers || []).some(
//     (id) => id.toString() === targetUserId.toString(),
//   );
//   const targetUserBlockedCurrentUser = (targetUser.blockedUsers || []).some(
//     (id) => id.toString() === currentUserId.toString(),
//   );

//   return currentUserBlockedTarget || targetUserBlockedCurrentUser;
// };

export async function emitUnreadMessageStatus(userId) {
  try {
    const userIdObj = new mongoose.Types.ObjectId(userId);

    const user = await User.findById(userIdObj).select("blockedUsers blockedBy").lean();
    const blockedUserIds = [
      ...(user?.blockedUsers?.map((id) => id.toString()) || []),
      ...(user?.blockedBy?.map((id) => id.toString()) || []),
    ];
    const blockedUserObjectIds = [...new Set(blockedUserIds)].map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    const conversations = await Conversation.find({
      $or: [
        { participants: userIdObj, hiddenFor: { $ne: userIdObj } },
        { "members.user": userIdObj },
      ],
    }).select("participants members isGroup");

    const dmConversationIds = [];
    const groupConversationIds = [];

    conversations.forEach((conv) => {
      if (conv.isGroup) {
        const isMember = conv.members.some(
          (m) => (m.user?._id ?? m.user).toString() === userId.toString(),
        );
        if (isMember) groupConversationIds.push(conv._id);
      } else {
        const otherParticipant = conv.participants.find((p) => p && !p.equals(userIdObj));
        if (
          otherParticipant &&
          !blockedUserObjectIds.some((blockedId) => blockedId.equals(otherParticipant))
        ) {
          dmConversationIds.push(conv._id);
        }
      }
    });

    // Exclude the active conversation from the count
    const activeConversationId = userActiveChats.get(userId.toString());
    const filterActive = (ids) =>
      activeConversationId
        ? ids.filter((id) => id.toString() !== activeConversationId)
        : ids;

    const eligibleDmIds = filterActive(dmConversationIds);
    const eligibleGroupIds = filterActive(groupConversationIds);

    // DMs: original boolean seen=false count
    const dmUnread = eligibleDmIds.length
      ? await Message.countDocuments({
          conversationId: { $in: eligibleDmIds },
          sender: { $ne: userIdObj },
          seen: false,
        })
      : 0;

    // Groups: per-user — count messages not yet in the user's seenBy array
    const groupUnread = eligibleGroupIds.length
      ? await Message.countDocuments({
          conversationId: { $in: eligibleGroupIds },
          sender: { $ne: userIdObj },
          seenBy: { $nin: [userIdObj] }, // user hasn't read it yet
        })
      : 0;

    const unreadMessageCount = dmUnread + groupUnread;

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
    if (!user) return;

    const lastReadTimestamp = user.lastReadFeedTimestamp || new Date(0);

    const newPostCount = await Post.countDocuments({
      user: { $ne: userIdObj },
      isScheduled: false,
      publishedAt: { $gt: lastReadTimestamp },
      isVent: { $ne: true },
      isIC: { $ne: true },
      parentPost: null, // ← replies excluded; reposts have parentPost: null so they count
    });

    recipientSocketIds.forEach((socketId) => {
      io.to(socketId).emit("newPostCount", { newPostCount });
    });
  } catch (error) {
    console.error(`Unhandled error in emitNewPostCount for user ${userId}:`, error);
  }
}

export async function emitNewICPostCount(userId) {
  try {
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const recipientSocketIds = getReceiverSocketIds(userId);

    const user = await User.findById(userIdObj).select("lastReadICFeedTimestamp").lean();
    if (!user) return;

    const lastReadTimestamp = user.lastReadICFeedTimestamp || new Date(0);

    const newICPostCount = await Post.countDocuments({
      user: { $ne: userIdObj },
      isScheduled: false,
      publishedAt: { $gt: lastReadTimestamp },
      isIC: true,
      isVent: { $ne: true },
      parentPost: null, // ← same fix
    });

    recipientSocketIds.forEach((socketId) => {
      io.to(socketId).emit("newICPostCount", { newICPostCount });
    });
  } catch (error) {
    console.error(`Unhandled error in emitNewICPostCount for user ${userId}:`, error);
  }
}

export async function emitNewVentPostCount(userId) {
  try {
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const recipientSocketIds = getReceiverSocketIds(userId);

    const user = await User.findById(userIdObj)
      .select("lastReadVentFeedTimestamp")
      .lean();
    if (!user) {
      console.warn(`User ${userId} not found for emitNewVentPostCount.`);
      return;
    }

    const lastReadTimestamp = user.lastReadVentFeedTimestamp || new Date(0);

    const newVentPostCount = await Post.countDocuments({
      user: { $ne: userIdObj },
      isScheduled: false,
      publishedAt: { $gt: lastReadTimestamp },
      isVent: true,
      parentPost: null, // ← same fix
    });

    recipientSocketIds.forEach((socketId) => {
      io.to(socketId).emit("newVentPostCount", { newVentPostCount });
    });
  } catch (error) {
    console.error(`Unhandled error in emitNewVentPostCount for user ${userId}:`, error);
  }
}

export async function emitNewICUnreadDot(userId) {
  try {
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const recipientSocketIds = getReceiverSocketIds(userId);
    if (recipientSocketIds.length === 0) return;

    const user = await User.findById(userIdObj).select("lastReadICFeedTimestamp").lean();
    if (!user) return;

    const lastReadTimestamp = user.lastReadICFeedTimestamp || new Date(0);

    const hasNew = await Post.exists({
      user: { $ne: userIdObj },
      isScheduled: false,
      publishedAt: { $gt: lastReadTimestamp },
      isIC: true,
      isVent: { $ne: true },
      parentPost: null, // 👈 Add this line to ignore replies
    });

    recipientSocketIds.forEach((socketId) => {
      io.to(socketId).emit("newICUnreadDot", { hasNew: !!hasNew });
    });
  } catch (error) {
    console.error(`Error in emitNewICUnreadDot for user ${userId}:`, error);
  }
}

export async function emitNewVentUnreadDot(userId) {
  try {
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const recipientSocketIds = getReceiverSocketIds(userId);
    if (recipientSocketIds.length === 0) return;

    const user = await User.findById(userIdObj)
      .select("lastReadVentFeedTimestamp")
      .lean();
    if (!user) return;

    const lastReadTimestamp = user.lastReadVentFeedTimestamp || new Date(0);

    const hasNew = await Post.exists({
      user: { $ne: userIdObj },
      isScheduled: false,
      publishedAt: { $gt: lastReadTimestamp },
      isVent: true,
      parentPost: null, // 👈 Add this line to ignore replies
    });

    recipientSocketIds.forEach((socketId) => {
      io.to(socketId).emit("newVentUnreadDot", { hasNew: !!hasNew });
    });
  } catch (error) {
    console.error(`Error in emitNewVentUnreadDot for user ${userId}:`, error);
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
      error,
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
      error,
    );
  }
}

export async function emitNewBoardPostCount(userId) {
  try {
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const recipientSocketIds = getReceiverSocketIds(userId);
    if (recipientSocketIds.length === 0) return;

    const user = await User.findById(userIdObj).select("lastReadBoardTimestamp").lean();
    const lastReadTimestamp = user?.lastReadBoardTimestamp || new Date(0);

    // Build exclusion list — blocked + muted
    const { blockedByMe, blockedMe } = await getBlockingUsers(userId);
    const blockedAndBlocking = [...new Set([...blockedByMe, ...blockedMe])];
    const blockedObjectIds = blockedAndBlocking.map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    const { all: mutedUserIds } = await getMutedUsers(userId);
    const mutedObjectIds = mutedUserIds.map((id) => new mongoose.Types.ObjectId(id));

    const excludeUserIds = [...blockedObjectIds, ...mutedObjectIds];

    const BoardPost = (await import("../models/boardPost.model.js")).default;

    const query = {
      user: { $ne: userIdObj },
      createdAt: { $gt: lastReadTimestamp },
      ...(excludeUserIds.length > 0 && { user: { $nin: excludeUserIds } }),
    };

    // Merge $ne and $nin — MongoDB requires $and when both target same field
    const finalQuery =
      excludeUserIds.length > 0
        ? {
            $and: [{ user: { $ne: userIdObj } }, { user: { $nin: excludeUserIds } }],
            createdAt: { $gt: lastReadTimestamp },
          }
        : { user: { $ne: userIdObj }, createdAt: { $gt: lastReadTimestamp } };

    const newBoardPostCount = await BoardPost.countDocuments(finalQuery);

    if (newBoardPostCount > 0) {
      recipientSocketIds.forEach((socketId) => {
        io.to(socketId).emit("newBoardPostCount", { newBoardPostCount });
      });
    }
  } catch (error) {
    console.error(`Error in emitNewBoardPostCount for user ${userId}:`, error);
  }
}

export async function emitFollowRequestCount(userId) {
  try {
    const user = await User.findById(userId).select("followRequests").lean();
    const count = user?.followRequests?.length ?? 0;
    const socketIds = getReceiverSocketIds(userId.toString());
    socketIds.forEach((id) => {
      io.to(id).emit("followRequestCount", { count });
    });
  } catch (error) {
    console.error(`Error in emitFollowRequestCount for user ${userId}:`, error);
  }
}

export const createAndSendBoardNotification = async ({
  from,
  to,
  type,
  boardPostId,
  boardCommentId,
}) => {
  try {
    if (from.toString() === to.toString()) return;

    const blocked = await isBlockedOrBlockedBy(from, to);
    if (blocked) return;

    const recipientDoc = await User.findById(to).select("mutedUsers").lean();
    const muteEntry = recipientDoc?.mutedUsers?.find(
      (m) => m.user.toString() === from.toString(),
    );

    // Total mute: no board notifications at all
    if (muteEntry?.muteType === "total") return;

    // Standard mute: board notifications are non-mention types — suppress all
    // (board comments/replies aren't @mentions, so standard mute silences them too)
    if (muteEntry?.muteType === "standard") return;

    // Notification and User are already imported at the top of this file
    const newNotification = new Notification({
      from,
      to,
      type,
      boardPostId: boardPostId || null,
      boardCommentId: boardCommentId || null,
    });
    await newNotification.save();

    // Populate sender for the real-time socket event
    await newNotification.populate({
      path: "from",
      select: "username fullName isCha isVerified isGoldVerified nameColor equipped",
      populate: { path: "profileImg", select: "imageUrl" },
    });

    // Populate boardPostId so the client can render preview + navigate
    if (boardPostId) {
      await newNotification.populate({
        path: "boardPostId",
        select: "title content images user",
        populate: [
          { path: "user", select: "username fullName" },
          { path: "images", select: "imageUrl" },
        ],
      });
    }

    if (boardCommentId) {
      await newNotification.populate({
        path: "boardCommentId",
        select: "content img image user",
        populate: { path: "image", select: "imageUrl" },
      });
    }

    // ── Push: only for offline recipients (same pattern as createAndSendNotification)
    const receiverSocketIds = getReceiverSocketIds(to.toString());

    if (receiverSocketIds.length === 0) {
      // User is offline — send push
      const fromUser = await User.findById(from).select("username").lean();
      const username = fromUser?.username ?? "A user";

      const payload = {
        title: getDynamicPushTitle(type),
        body: getDynamicPushBody(type, username),
        url: `/board/${boardPostId}`,
        icon: `${BASE_URL}/klaynelogoreal.png`,
      };

      await sendPushNotification(to.toString(), payload);
    } else {
      // User is online — emit real-time notification
      receiverSocketIds.forEach((socketId) => {
        io.to(socketId).emit("newNotification", newNotification);
      });
    }

    await emitUnreadNotificationStatus(to.toString());
  } catch (error) {
    console.error("Error in createAndSendBoardNotification:", error.message);
  }
};

export const createAndSendNotification = async ({
  from,
  to,
  type,
  postId,
  isAnonymousInteraction = false,
}) => {
  try {
    if (from.toString() === to.toString()) return;

    const blocked = await isBlockedOrBlockedBy(from, to);
    if (blocked) return;

    const recipientDoc = await User.findById(to).select("mutedUsers").lean();
    const muteEntry = recipientDoc?.mutedUsers?.find(
      (m) => m.user.toString() === from.toString(),
    );

    if (muteEntry?.muteType === "total") return; // total mute — no notifications at all

    // standard mute: still deliver mention notifications, block everything else
    if (muteEntry?.muteType === "standard") {
      const allowedTypes = ["mention", "replyMention", "reply"];
      if (!allowedTypes.includes(type)) return;
    }

    const newNotification = new Notification({
      from,
      to,
      type,
      postId,
      isAnonymousInteraction,
    });
    await newNotification.save();

    await newNotification.populate({
      path: "from",
      select: "username fullName equipped nameColor isVerified isGoldVerified isCha",
      populate: { path: "profileImg", select: "imageUrl" },
    });

    if (postId) {
      await newNotification.populate({
        path: "postId",
        select: "text img user isAnonymous parentPost",
        populate: [
          { path: "user", select: "username fullName" },
          {
            path: "parentPost",
            select: "user",
            populate: { path: "user", select: "username" },
          },
        ],
      });
    }

    if (isAnonymousInteraction) {
      newNotification.from.username = "Anonymous";
      newNotification.from.fullName = "Anonymous";
      newNotification.from.profileImg = { imageUrl: "/avatar-placeholder.png" };
    }

    // --- Build push payload (always, regardless of socket status) ---
    const fromUser = await User.findById(from).select("username").lean();
    const username = isAnonymousInteraction
      ? "Anonymous"
      : (fromUser?.username ?? "A user");

    let postOwnerUsername = null;
    if (postId) {
      const post = await Post.findById(postId)
        .populate("user", "username")
        .populate({ path: "parentPost", populate: { path: "user", select: "username" } })
        .lean();
      if (post?.user) postOwnerUsername = post.user.username;
    }

    const payload = {
      title: getDynamicPushTitle(type),
      body: getDynamicPushBody(type, username),
      url: getDynamicPushUrl(type, postOwnerUsername, postId, username),
      icon: `${BASE_URL}/klaynelogoreal.png`,
    };

    // Always send push — it handles background/locked screen delivery
    await sendPushNotification(to.toString(), payload);

    // --- Socket: real-time in-app UI update ---
    const receiverSocketIds = getReceiverSocketIds(to.toString());
    receiverSocketIds.forEach((socketId) => {
      io.to(socketId).emit("newNotification", newNotification);
    });

    await emitUnreadNotificationStatus(to.toString());
  } catch (error) {
    console.error("Error in createAndSendNotification:", error.message);
  }
};

// Emit to all online followers when a user sets/updates their note
export async function emitNoteUpdated(authorId, note) {
  try {
    const author = await User.findById(authorId)
      .select("followers username fullName profileImg nameColor equipped")
      .populate("profileImg", "imageUrl")
      .lean();
    if (!author) return;

    const payload = {
      _id:       authorId.toString(),
      userId:    authorId.toString(),
      username:  author.username,
      fullName:  author.fullName,
      profileImg: author.profileImg,
      nameColor: author.nameColor,
      equipped:  author.equipped,
      note,
    };

    for (const followerId of author.followers) {
      const sids = getReceiverSocketIds(followerId.toString());
      if (sids.length) io.to(sids).emit("inbox_note_updated", payload);
    }
  } catch (err) {
    console.error("emitNoteUpdated error:", err.message);
  }
}

// Emit to all online followers when a user removes their note
export async function emitNoteDeleted(authorId) {
  try {
    const author = await User.findById(authorId).select("followers").lean();
    if (!author) return;

    const payload = { userId: authorId.toString() };

    for (const followerId of author.followers) {
      const sids = getReceiverSocketIds(followerId.toString());
      if (sids.length) io.to(sids).emit("inbox_note_deleted", payload);
    }
  } catch (err) {
    console.error("emitNoteDeleted error:", err.message);
  }
}

export const PUBLIC_CHAT_ROOM = "public_chat_room";

io.on("connection", async (socket) => {
const userId =
  socket.handshake.auth?.userId ||
  socket.handshake.query?.userId || // ← existing clients send via query
  socket.data?.userId;

  socket.on("join_pomodoro_room", () => {
    socket.join("live_pomodoro");

    // User reconnected within the grace window — cancel the pending removal
    if (userId && disconnectTimers.has(userId)) {
      clearTimeout(disconnectTimers.get(userId));
      disconnectTimers.delete(userId);
      console.log(
        `[LivePomodoro] Grace-period timer cancelled for ${userId} (reconnected)`,
      );
    }
  });

  socket.on("leave_pomodoro_room", () => {
    // Called by useLiveSessions cleanup when navigating away from the dashboard
    socket.leave("live_pomodoro");
  });

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
    emitNewICUnreadDot(userId);
    emitNewVentUnreadDot(userId);
    await emitUnreadPublicChatStatus(userId);
    await emitNewBoardPostCount(userId); // ADD THIS
    await emitFollowRequestCount(userId);

  } else {
    socket.disconnect(true);
    return;
  }

  io.emit("getOnlineUsers", getOnlineUserIds());

  socket.on("changeOnlineStatus", ({ status }) => {
    if (!socket.userId) return;

    if (status === "offline") {
      offlineStatusUsers.set(socket.userId, true);
    } else if (status === "online") {
      offlineStatusUsers.delete(socket.userId);
    }

    // Broadcast the updated list of online users to all clients
    io.emit("getOnlineUsers", getOnlineUserIds());
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

    try {
      // Get or create the per-conversation typing map
      if (!typingUsersInConversation.has(conversationId)) {
        typingUsersInConversation.set(conversationId, new Map());
      }
      const typingMap = typingUsersInConversation.get(conversationId);

      // Resolve username (cached on socket after first lookup)
      if (!socket.username) {
        const user = await User.findById(senderId).select("username").lean();
        if (!user) return;
        socket.username = user.username;
      }

      // Always update (covers isEditing toggle too)
      typingMap.set(senderId, { username: socket.username, isEditing });

      const conversation = await Conversation.findById(conversationId)
        .select("participants members isGroup")
        .lean();
      if (!conversation) return;

      // Build recipient list — works for both DMs and groups
      const recipientIds = conversation.isGroup
        ? conversation.members
            .map((m) => m.user.toString())
            .filter((id) => id !== senderId)
        : conversation.participants
            .map((p) => p.toString())
            .filter((id) => id !== senderId);

      // Build the typing array to broadcast
      const typingUsersArray = Array.from(typingMap.entries()).map(([userId, data]) => ({
        userId,
        username: data.username,
        isEditing: data.isEditing,
      }));

      for (const recipientId of recipientIds) {
        // Skip block check for groups (members already opted in)
        if (!conversation.isGroup) {
          const blocked = await isBlockedOrBlockedBy(senderId, recipientId);
          if (blocked) continue;
        }

        const receiverSocketIds = getReceiverSocketIds(recipientId);
        receiverSocketIds.forEach((sockId) => {
          io.to(sockId).emit("typing_update", {
            conversationId,
            typingUsers: typingUsersArray,
          });
        });
      }
    } catch (err) {
      console.error("Error in typing handler:", err);
    }
  });

  socket.on("stopTyping", async ({ conversationId }) => {
    const senderId = socket.userId;
    if (!conversationId || !senderId) return;

    try {
      const typingMap = typingUsersInConversation.get(conversationId);
      if (!typingMap || !typingMap.has(senderId)) return;

      typingMap.delete(senderId);
      if (typingMap.size === 0) {
        typingUsersInConversation.delete(conversationId);
      }

      const conversation = await Conversation.findById(conversationId)
        .select("participants members isGroup")
        .lean();
      if (!conversation) return;

      const recipientIds = conversation.isGroup
        ? conversation.members
            .map((m) => m.user.toString())
            .filter((id) => id !== senderId)
        : conversation.participants
            .map((p) => p.toString())
            .filter((id) => id !== senderId);

      const typingUsersArray = Array.from((typingMap || new Map()).entries()).map(
        ([userId, data]) => ({
          userId,
          username: data.username,
          isEditing: data.isEditing,
        }),
      );

      for (const recipientId of recipientIds) {
        if (!conversation.isGroup) {
          const blocked = await isBlockedOrBlockedBy(senderId, recipientId);
          if (blocked) continue;
        }

        const receiverSocketIds = getReceiverSocketIds(recipientId);
        receiverSocketIds.forEach((sockId) => {
          io.to(sockId).emit("typing_update", {
            conversationId,
            typingUsers: typingUsersArray,
          });
        });
      }
    } catch (err) {
      console.error("Error in stopTyping handler:", err);
    }
  });

  socket.on("userActiveInChat", ({ conversationId }) => {
    userActiveChats.set(userId, conversationId ? conversationId.toString() : null);
    emitUnreadMessageStatus(userId);
  });

  socket.on("markMessagesAsSeen", async ({ conversationId }) => {
    try {
      const readerId = socket.userId;
      const conversationObjectId = new mongoose.Types.ObjectId(conversationId);
      const readerObjectId = new mongoose.Types.ObjectId(readerId);

      const conversation = await Conversation.findById(conversationObjectId)
        .select("isGroup participants members")
        .lean();

      if (!conversation) return;

      if (conversation.isGroup) {
        const unseenCount = await Message.countDocuments({
          conversationId: conversationObjectId,
          sender: { $ne: readerObjectId },
          seenBy: { $nin: [readerObjectId] },
        });

        if (unseenCount === 0) return;

        await Message.updateMany(
          {
            conversationId: conversationObjectId,
            sender: { $ne: readerObjectId },
            seenBy: { $nin: [readerObjectId] },
          },
          { $addToSet: { seenBy: readerObjectId } },
        );

        await Conversation.updateOne(
          {
            _id: conversationObjectId,
            "lastMessage.sender": { $ne: readerObjectId },
            "lastMessage.seenBy": { $nin: [readerObjectId] },
          },
          { $addToSet: { "lastMessage.seenBy": readerObjectId } },
          { timestamps: false },
        );

        await emitUnreadMessageStatus(readerId);

        const lastSeenMessage = await Message.findOne({
          conversationId: conversationObjectId,
          sender: { $ne: readerObjectId },
          seenBy: readerObjectId,
        })
          .sort({ createdAt: -1 })
          .select("_id")
          .lean();

        const readerUser = await User.findById(readerObjectId)
          .select("username fullName profileImg")
          .populate("profileImg", "imageUrl")
          .lean();

        // Emit to everyone currently viewing this conversation
        io.to(conversationId.toString()).emit("groupMessagesSeen", {
          conversationId,
          readerId: readerObjectId.toString(),
          readerUser,
          lastSeenMessageId: lastSeenMessage?._id?.toString() ?? null,
        });

        // Fetch and broadcast the updated conversation to all online members
        const updatedConversation = await Conversation.findById(conversationObjectId)
          .populate({
            path: "members.user",
            select: "username fullName profileImg",
            populate: { path: "profileImg", select: "imageUrl" },
          })
          .populate({ path: "avatar", select: "imageUrl" })
          .populate({ path: "lastMessage.sender", select: "username fullName" });

        if (updatedConversation) {
          const allMemberIds = updatedConversation.members.map((m) =>
            (m.user?._id ?? m.user).toString(),
          );
          allMemberIds.forEach((memberId) => {
            const memberSocketIds = getReceiverSocketIds(memberId);
            if (memberSocketIds.length > 0) {
              io.to(memberSocketIds).emit("conversationUpdated", updatedConversation);
            }
          });
        }
      } else {
        // ── DM: original boolean path (unchanged) ────────────────────────────
        const unseenMessagesCount = await Message.countDocuments({
          conversationId: conversationObjectId,
          sender: { $ne: readerObjectId },
          seen: false,
        });

        if (unseenMessagesCount === 0) return;

        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            await Message.updateMany(
              {
                conversationId: conversationObjectId,
                sender: { $ne: readerObjectId },
                seen: false,
              },
              {
                $set: { seen: true },
                $addToSet: { seenBy: readerObjectId }, // keep seenBy in sync for DMs too
              },
              { session },
            );

            await Conversation.updateOne(
              {
                _id: conversationObjectId,
                "lastMessage.sender": { $ne: readerObjectId },
                "lastMessage.seen": false,
              },
              {
                $set: { "lastMessage.seen": true },
                $addToSet: { "lastMessage.seenBy": readerObjectId },
              },
              { timestamps: false, session },
            );
          });
        } finally {
          await session.endSession();
        }

        const lastSeenMessage = await Message.findOne({
          conversationId: conversationObjectId,
          sender: { $ne: readerObjectId },
          seenBy: readerObjectId,
        })
          .sort({ createdAt: -1 })
          .select("_id")
          .lean();

        const readerUser = await User.findById(readerObjectId)
          .select("username fullName profileImg")
          .populate("profileImg", "imageUrl")
          .lean();

        // Broadcast to ALL members (including the reader, so their own UI updates)
        // const allMemberIds = conversation.members.map((m) =>
        //   (m.user?._id ?? m.user).toString(),
        // );
        // allMemberIds.forEach((memberId) => {
        //   const sockets = getReceiverSocketIds(memberId);
        //   if (sockets.length > 0) {
        //     io.to(sockets).emit("groupMessagesSeen", {
        //       conversationId,
        //       readerId: readerObjectId.toString(),
        //       readerUser,
        //       lastSeenMessageId: lastSeenMessage?._id?.toString() ?? null,
        //     });
        //   }
        // });

        io.to(conversationId.toString()).emit("groupMessagesSeen", {
          conversationId,
          readerId: readerObjectId.toString(),
          readerUser,
          lastSeenMessageId: lastSeenMessage?._id?.toString() ?? null,
        });

        const updatedConversation = await Conversation.findById(conversationObjectId)
          .populate({
            path: "participants",
            select:
              "username fullName isCha isVerified isGoldVerified badges preferredBadge nameColor",
            populate: { path: "profileImg", select: "imageUrl" },
          })
          .populate({ path: "avatar", select: "imageUrl" })
          .populate({
            path: "lastMessage.sender",
            select: "username fullName",
            populate: { path: "profileImg", select: "imageUrl" },
          });

        if (updatedConversation) {
          updatedConversation.participants.forEach((participant) => {
            const participantSocketIds = getReceiverSocketIds(participant._id.toString());
            if (participantSocketIds.length > 0) {
              io.to(participantSocketIds).emit(
                "conversationUpdated",
                updatedConversation,
              );
            }
          });

          // DM tick indicator
          const otherParticipant = updatedConversation.participants.find(
            (p) => p._id.toString() !== readerId,
          );
          if (otherParticipant) {
            const senderSocketIds = getReceiverSocketIds(otherParticipant._id.toString());
            if (senderSocketIds.length > 0) {
              io.to(senderSocketIds).emit("messagesSeen", {
                conversationId,
                readerId,
                messageCount: unseenMessagesCount,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error marking messages as seen (socket):", error);
    }
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
          { new: true },
        );
      } else {
        // If no messages yet, just set to current time
        await User.findByIdAndUpdate(
          socket.userId,
          { $set: { lastReadPublicChatTimestamp: new Date() } },
          { new: true },
        );
      }
      // After marking as read, emit false to ensure no red dot appears
      emitUnreadPublicChatStatus(socket.userId);
    } catch (error) {
      console.error(
        `Error marking public chat as read on "userEnteredPublicChat" for user ${socket.userId}:`,
        error,
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

      if (socket.username) {
        userUsername = socket.username;
      } else {
        const user = await User.findById(socket.userId).select("username").lean();
        if (!user) return;
        userUsername = user.username;
        socket.username = user.username;
      }

      publicChatTypingUsers.set(socket.userId, {
        username: userUsername,
        isEditing: isEditing,
        timestamp: Date.now(),
      });

      const typingUsersArray = Array.from(publicChatTypingUsers.entries()).map(
        ([userId, data]) => ({
          userId,
          username: data.username,
          isEditing: data.isEditing,
        }),
      );
      socket.to(PUBLIC_CHAT_ROOM).emit("public_typing_update", {
        typingUsers: typingUsersArray,
      });
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
      }),
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
        { $set: { read: true } },
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
  const uid = userInfo?.userId;

  console.log(`User disconnected: ${username} - ${uid}`);
  socketUserMap.delete(socket.id);

  if (!disconnectedUserId) return;

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

  const LIVE_POMODORO_GRACE_MS = 20_000;

  if (userSockets) {
    userSockets.delete(socket.id);

    if (userSockets.size === 0) {
      onlineUsersMap.delete(disconnectedUserId);

      typingUsersInConversation.forEach((typingMap, convId) => {
        if (typingMap.has(disconnectedUserId)) {
          typingMap.delete(disconnectedUserId);
          if (typingMap.size === 0) typingUsersInConversation.delete(convId);
        }
      });

      if (wasActiveInChat && activeConversationId) {
        emitUnreadMessageStatus(disconnectedUserId);
      }

      // ── Grace-period live-dashboard removal ──────────────────────────────
      // Don't remove immediately — give the user 20s to reconnect (page refresh).
      // If they call join_pomodoro_room within that window the timer is cancelled.
  if (!disconnectTimers.has(disconnectedUserId)) {
    const timerId = setTimeout(() => {
      disconnectTimers.delete(disconnectedUserId);
      io.to("live_pomodoro").emit("live_session_stopped", {
        userId: disconnectedUserId,
      });
      console.log(`[LivePomodoro] Grace period expired — removed ${disconnectedUserId}`);
    }, LIVE_POMODORO_GRACE_MS);

    disconnectTimers.set(disconnectedUserId, timerId);
  }
    }
  }

  io.emit("getOnlineUsers", getOnlineUserIds());
});

  socket.on("heartbeat", () => {
    if (socket.userId) {
      userLastActive.set(socket.userId, Date.now());
    }
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
      offlineStatusUsers.delete(userId); // Also remove from the offline status map

      usersToRemove.push(userId);
    }
  }

  if (usersToRemove.length > 0) {
    io.emit("getOnlineUsers", getOnlineUserIds());
  }
}, CHECK_INTERVAL);

export { io, server, app };
