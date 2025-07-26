import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import {
  getReceiverSocketIds,
  io,
  emitUnreadMessageStatus,
  userActiveChats,
} from "../lib/socket.js";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/user.model.js";
import mongoose from "mongoose";

const getBlockingUsers = async (userId) => {
  if (!userId) {
    return { blockedByMe: [], blockedMe: [] };
  }
  const user = await User.findById(userId).select("blockedUsers blockedBy").lean();
  return {
    blockedByMe: user.blockedUsers?.map((id) => id.toString()) || [],
    blockedMe: user.blockedBy?.map((id) => id.toString()) || [],
  };
};

const isBlockedOrBlockedBy = async (currentUserId, targetUserId) => {
  if (!currentUserId || !targetUserId) {
    return false;
  }
  if (currentUserId.toString() === targetUserId.toString()) {
    return false;
  }

  const currentUser = await User.findById(currentUserId)
    .select("blockedUsers blockedBy")
    .lean();
  const targetUser = await User.findById(targetUserId)
    .select("blockedUsers blockedBy")
    .lean();

  if (!currentUser || !targetUser) {
    return false;
  }

  let currentUserBlockedTarget;
  try {
    currentUserBlockedTarget = (currentUser.blockedUsers || []).some((id) => {
      const result = id.toString() === targetUserId.toString();
      return result;
    });
  } catch (e) {
    throw e;
  }

  let targetUserBlockedCurrentUser;
  try {
    targetUserBlockedCurrentUser = (targetUser.blockedUsers || []).some((id) => {
      const result = id.toString() === currentUserId.toString();
      return result;
    });
  } catch (e) {
    throw e;
  }

  return currentUserBlockedTarget || targetUserBlockedCurrentUser;
};

export const sendMessage = async (req, res) => {
  try {
    const { message, conversationId, repliedTo } = req.body;
    let { img } = req.body;
    const senderId = req.user._id;

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID is required." });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation || !conversation.participants.includes(senderId)) {
      return res.status(403).json({ error: "Unauthorized or invalid conversation." });
    }

    const recipientId = conversation.participants.find((p) => !p.equals(senderId));

    const senderIsBlocked = await isBlockedOrBlockedBy(senderId, recipientId);

    if (senderIsBlocked) {
      return res.status(403).json({ error: "You cannot send messages to this user." });
    }

    if (!recipientId) {
      return res.status(404).json({ error: "Conversation recipient not found." });
    }

    if (conversation.hiddenFor && conversation.hiddenFor.length > 0) {
      conversation.hiddenFor = [];
    }

    // --- CORE LOGIC CHANGE ---
    // Check if the recipient is currently active in this specific chat.
    const recipientActiveConversation = userActiveChats.get(recipientId.toString());
    const isSeen = recipientActiveConversation === conversationId.toString();
    // --- END OF CORE LOGIC CHANGE ---

    let uploadedImgUrl = "";
    if (img) {
      const uploadedResponse = await cloudinary.uploader.upload(img);
      uploadedImgUrl = uploadedResponse.secure_url;
    }

    const newMessage = new Message({
      conversationId: conversation._id,
      sender: senderId,
      text: message || "",
      img: uploadedImgUrl,
      repliedTo: repliedTo || null,
      seen: isSeen, // Set the correct 'seen' status from the start
    });

    await newMessage.save();

    // Update the conversation's lastMessage and timestamp
    conversation.lastMessage = {
      text: newMessage.text,
      img: newMessage.img,
      sender: senderId,
      seen: isSeen, // Also set the correct 'seen' status here
      messageId: newMessage._id,
    };
    await conversation.save();

    // Populate details for the socket payload and response
    await newMessage.populate(
      "sender",
      "username profileImg fullName isVerified isGoldVerified"
    );

    if (newMessage.repliedTo) {
      await newMessage.populate({
        path: "repliedTo",
        select: "text img sender createdAt", // Select the fields you need for display
        populate: {
          path: "sender",
          select: "username profileImg", // Populate the sender of the replied-to message
        },
      });
    }

    const recipientSocketIds = getReceiverSocketIds(recipientId.toString());
    if (recipientSocketIds.length > 0) {
      io.to(recipientSocketIds).emit("newMessage", newMessage.toObject());
    }

    if (isSeen) {
      const senderSocketIds = getReceiverSocketIds(senderId.toString());
      io.to(senderSocketIds).emit("messagesSeen", {
        conversationId: conversationId,
        readerId: recipientId,
      });
    }

    await emitUnreadMessageStatus(recipientId.toString());
    await emitUnreadMessageStatus(senderId.toString());

    // Return the correct message object in the API response.
    res.status(201).json(newMessage.toObject());
  } catch (error) {
    console.error("Error in sendMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const getMessagesByConversationId = async (req, res) => {
  const { conversationId } = req.params;
  const { page = 1, limit = 40 } = req.query;
  const userId = req.user._id;

  try {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found." });
    }

    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ error: "Unauthorized access to conversation." });
    }

    const otherParticipantId = conversation.participants.find(
      (participantId) => participantId.toString() !== userId.toString()
    );

    if (otherParticipantId) {
      const isBlocked = await isBlockedOrBlockedBy(userId, otherParticipantId);

      if (isBlocked) {
        return res.status(403).json({
          error: "You cannot view this conversation due to blocking restrictions.",
        });
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.find({
      conversationId: conversationId,
    })
      .sort({ createdAt: -1 }) // Fetch in reverse to get newest last when reversed later
      .skip(skip)
      .limit(parseInt(limit))
      .populate("sender", "username profileImg fullName isVerified isGoldVerified")
      .populate({
        path: "repliedTo",
        select: "sender text img",
        populate: {
          path: "sender",
          select: "username fullName profileImg isVerified isGoldVerified",
        },
      });

    res.status(200).json(messages.reverse()); // Reverse to have oldest first for UI display
  } catch (error) {
    console.error("Error in getMessagesByConversationId controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const getConversations = async (req, res) => {
  const userId = req.user._id;

  try {
    // Find the current user to get their list of blocked users
    const user = await User.findById(userId);
    const blockedByMe = user.blockedUsers || [];

    // Find users who have blocked the current user
    const usersBlockingMe = await User.find({ blockedUsers: userId }).select("_id");
    const blockedMe = usersBlockingMe.map((u) => u._id);

    const allBlockedIds = [...new Set([...blockedByMe, ...blockedMe])];

    const conversations = await Conversation.find({
      participants: userId,
      hiddenFor: { $ne: userId },
    })
      .populate({
        path: "participants",
        select: "username profileImg fullName isVerified isGoldVerified",
      })
      .sort({ updatedAt: -1 })
      .lean();

    // Filter out conversations where the other participant is blocked or has blocked you
    const filteredConversations = conversations.filter((conv) => {
      const otherParticipant = conv.participants.find(
        (p) => p._id.toString() !== userId.toString()
      );
      // If for some reason there's no other participant, or they are in the blocked list, exclude it.
      if (!otherParticipant) return false;
      return !allBlockedIds.some((blockedId) => blockedId.equals(otherParticipant._id));
    });

    res.status(200).json(filteredConversations);
  } catch (error) {
    console.error("Error in getConversations controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const messageToDelete = await Message.findById(messageId);

    if (!messageToDelete) {
      return res.status(404).json({ error: "Message not found." });
    }

    if (messageToDelete.sender.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "You are not authorized to delete this message." });
    }

    const conversation = await Conversation.findById(messageToDelete.conversationId);
    if (conversation) {
      const otherParticipantId = conversation.participants.find(
        (p) => p.toString() !== userId.toString()
      );
      if (
        otherParticipantId &&
        (await isBlockedOrBlockedBy(userId, otherParticipantId))
      ) {
        return res.status(403).json({
          error:
            "You cannot delete messages in this conversation due to blocking restrictions.",
        });
      }
    }

    if (messageToDelete.img) {
      const imgId = messageToDelete.img.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(imgId);
    }

    await Message.findByIdAndDelete(messageId);

    const updatedConversation = await Conversation.findById(
      messageToDelete.conversationId
    );
    if (updatedConversation) {
      if (
        updatedConversation.lastMessage &&
        updatedConversation.lastMessage.text === messageToDelete.text &&
        updatedConversation.lastMessage.sender.toString() ===
          messageToDelete.sender.toString()
      ) {
        const newLastMessage = await Message.findOne({
          conversationId: updatedConversation._id,
        })
          .sort({ createdAt: -1 })
          .limit(1);

        if (newLastMessage) {
          updatedConversation.lastMessage = {
            text: newLastMessage.text,
            img: newLastMessage.img,
            sender: newLastMessage.sender,
            seen: newLastMessage.seen,
            createdAt: newLastMessage.createdAt,
          };
        } else {
          updatedConversation.lastMessage = null;
        }
        await updatedConversation.save();
      }
    }

    const participants = updatedConversation ? updatedConversation.participants : [];
    for (const participantId of participants) {
      const socketIds = getReceiverSocketIds(participantId.toString());
      socketIds.forEach((socketId) => {
        io.to(socketId).emit("messageDeleted", {
          messageId,
          conversationId: messageToDelete.conversationId,
        });
      });
      await emitUnreadMessageStatus(participantId.toString());
    }

    res.status(200).json({ message: "Message deleted successfully." });
  } catch (error) {
    console.error("Error in deleteMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: No user authenticated" });
    }

    if (!messageId || !emoji) {
      return res.status(400).json({ error: "Message ID and emoji are required." });
    }

    if (!["❤️", "👍", "😂", "😭", "😡"].includes(emoji)) {
      return res.status(400).json({ error: "Invalid emoji provided." });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const messageSenderId = message.sender.toString();
    if (await isBlockedOrBlockedBy(userId, messageSenderId)) {
      return res.status(403).json({
        error: "You cannot react to this message due to blocking restrictions.",
      });
    }

    // Use findOneAndUpdate with atomic operators
    const reactionExists = message.reactions.some(
      (reaction) =>
        reaction.user.toString() === userId.toString() && reaction.emoji === emoji
    );

    let updatedMessage;
    if (reactionExists) {
      // Pull the reaction if it exists
      updatedMessage = await Message.findOneAndUpdate(
        { _id: messageId, "reactions.user": userId, "reactions.emoji": emoji },
        { $pull: { reactions: { user: userId, emoji: emoji } } },
        { new: true } // Return the updated document
      );
    } else {
      // Push the reaction if it doesn't exist
      updatedMessage = await Message.findOneAndUpdate(
        { _id: messageId },
        { $push: { reactions: { emoji, user: userId } } },
        { new: true } // Return the updated document
      );
    }

    if (!updatedMessage) {
      // This might happen if the message was deleted between findById and findOneAndUpdate
      return res.status(404).json({ error: "Message not found or update failed." });
    }

    const populatedMessage = await Message.findById(updatedMessage._id)
      .populate({
        path: "sender",
        select: "username fullName profileImg isVerified isGoldVerified",
      })
      .populate({
        path: "repliedTo",
        select: "text img",
        populate: {
          path: "sender",
          select: "username fullName profileImg isVerified isGoldVerified",
        },
      })
      .populate({
        path: "reactions.user",
        select: "username fullName profileImg",
      });

    const conversation = await Conversation.findById(populatedMessage.conversationId);
    if (conversation) {
      conversation.participants.forEach((participantId) => {
        const receiverSocketIds = getReceiverSocketIds(participantId.toString());
        receiverSocketIds.forEach((socketId) => {
          io.to(socketId).emit("messageReacted", {
            actorId: userId,
            updatedMessage: populatedMessage,
          });
        });
      });
    }

    return res.status(200).json(populatedMessage);
  } catch (error) {
    console.error("Error in reactToMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { newText } = req.body;
    const senderId = req.user._id;

    if (!newText || newText.trim() === "") {
      return res.status(400).json({ error: "Message text cannot be empty" });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.sender.toString() !== senderId.toString()) {
      return res
        .status(403)
        .json({ error: "You are not authorized to edit this message" });
    }

    // Store the old text before updating for comparison if needed
    const oldText = message.text;

    // Update the message document
    message.text = newText;
    message.isEdited = true; // Mark as edited
    await message.save();

    // --- CRUCIAL CHANGE: Populate message for emission ---
    // Populate sender, and if it's a reply, populate repliedTo and repliedTo.sender
    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "username fullName profileImg isVerified isGoldVerified") // Ensure sender is populated
      .populate({
        path: "repliedTo",
        populate: {
          path: "sender",
          select: "username fullName", // Only necessary fields for repliedTo sender
        },
        select: "text img sender", // Select relevant fields for repliedTo message itself
      });

    const conversation = await Conversation.findById(message.conversationId);

    if (conversation) {
      if (
        conversation.lastMessage &&
        conversation.lastMessage.messageId &&
        conversation.lastMessage.messageId.toString() === message._id.toString()
      ) {
        conversation.lastMessage.text = newText;
        conversation.lastMessage.isEdited = true;

        await conversation.save();

        // Emit conversation update for sidebar, use the fully updated conversation if possible
        const updatedConversation = await Conversation.findById(conversation._id)
          .populate(
            "participants",
            "username fullName profileImg isVerified isGoldVerified"
          )
          .populate(
            "lastMessage.sender",
            "username fullName profileImg isVerified isGoldVerified"
          )
          .lean(); // Fetch the latest state of the conversation

        io.to(senderId.toString()).emit("conversationUpdated", updatedConversation);
        const receiverId = conversation.participants.find(
          (pId) => pId.toString() !== senderId.toString()
        );
        const receiverSocketIds = getReceiverSocketIds(receiverId);
        if (receiverSocketIds.length > 0) {
          receiverSocketIds.forEach((socketId) => {
            io.to(socketId).emit("conversationUpdated", updatedConversation);
          });
        }
      }

      io.to(conversation._id.toString()).emit("messageEdited", populatedMessage); // Emit to the conversation room for all participants
    }

    res.status(200).json(populatedMessage);
  } catch (error) {
    console.error("Error in editMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const toggleConversationVisibility = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // First, find the conversation to check its current state without getting a full Mongoose document
    const conversation = await Conversation.findById(conversationId).lean();

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Authorization check
    if (!conversation.participants.some((p) => p.equals(userId))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!conversation.hiddenFor) {
      conversation.hiddenFor = [];
    }

    const isHidden = conversation.hiddenFor.some((id) => id.equals(userId));

    let updateOperation;
    if (isHidden) {
      // If it's already hidden, we want to unhide it by pulling the user's ID
      updateOperation = { $pull: { hiddenFor: userId } };
    } else {
      // If it's not hidden, we want to hide it by adding the user's ID to the set
      updateOperation = { $addToSet: { hiddenFor: userId } }; // Using $addToSet is safer than $push
    }

    // Perform the update using updateOne and disable timestamps for this operation
    await Conversation.updateOne(
      { _id: conversationId },
      updateOperation,
      { timestamps: false } // This is the magic part ✨
    );

    res.status(200).json({
      message: isHidden
        ? "Conversation unhid successfully"
        : "Conversation hid successfully",
    });
  } catch (error) {
    console.error("Error in toggleConversationVisibility controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getConversationBetweenUsers = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, otherUserId] },
    }).lean();

    if (!conversation) {
      return res
        .status(200)
        .json({ conversationId: null, isHiddenForCurrentUser: false });
    }

    const isHiddenForCurrentUser = conversation.hiddenFor.some((id) =>
      id.equals(currentUserId)
    );

    res.status(200).json({
      conversationId: conversation._id,
      isHiddenForCurrentUser: isHiddenForCurrentUser,
    });
  } catch (error) {
    console.error("Error in getConversationBetweenusers controller:", error.message);
    res.status(500).json({ error: "Internal Server Error " + error.message });
  }
};

export const getFollowedUsersForMessaging = async (req, res) => {
  try {
    const userId = req.user._id; // Authenticated user's ID
    const { q } = req.query; // Get the search query from req.query

    // Find the current user to get their following list
    const currentUser = await User.findById(userId).select("following");

    if (!currentUser) {
      return res.status(404).json({ error: "Current user not found." });
    }

    // Get the IDs of users the current user is following
    const followedUserIds = currentUser.following;

    let query = {
      _id: { $in: followedUserIds }, // Only search within followed users
    };

    if (q) {
      // If a search query 'q' is provided, add the regex filter
      query.$or = [
        { username: { $regex: `^${q}`, $options: "i" } }, // Starts with `q` (case-insensitive)
        { fullName: { $regex: `^${q}`, $options: "i" } }, // Starts with `q` (case-insensitive)
      ];
    }

    // Fetch details of followed users based on the constructed query
    const followedUsers = await User.find(query)
      .select("-password -email -blockedUsers -followers -following") // Select fields to return
      .limit(10); // You might want to limit results for suggestions, e.g., 10-20

    res.status(200).json(followedUsers);
  } catch (error) {
    console.error("Error in getFollowedUsersForMessaging controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getOrCreateConversation = async (req, res) => {
  try {
    const { targetUserId } = req.body; // The user you want to chat with
    const currentUserId = req.user._id;

    if (currentUserId.toString() === targetUserId.toString()) {
      return res.status(400).json({ error: "Cannot create conversation with yourself." });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, targetUserId] },
      // isGroup: false, // Include if applicable
    });

    if (!conversation) {
      // This fallback is crucial for robustness, even if it "shouldn't" be hit
      return res.status(404).json({
        error: "Conversation not found. You can only message users you follow.",
      });
    }

    // Check if it's hidden for the current user
    const isHiddenForCurrentUser = conversation.hiddenFor.includes(currentUserId);

    if (isHiddenForCurrentUser) {
      // If it's hidden, we need to unhide it.
      // Use updateOne with $pull to remove the userId from hiddenFor,
      // and critically, disable timestamp updates for this operation.
      await Conversation.updateOne(
        { _id: conversation._id },
        { $pull: { hiddenFor: currentUserId } },
        { timestamps: false } // ✨ This prevents `updatedAt` from changing
      );

      // After updating, refetch the conversation to get its *latest* state including the unhidden status
      // and populate participants for the frontend response.
      // This ensures the frontend receives the correct, unhidden conversation object.
      conversation = await Conversation.findById(conversation._id).populate(
        "participants",
        "-password -email -blockedUsers -following -followers"
      );
    } else {
      // If it's not hidden, we just need to populate it for the response
      // as no update was needed.
      conversation = await conversation.populate(
        "participants",
        "-password -email -blockedUsers -following -followers"
      );
    }

    // Return the existing (and possibly unhidden) conversation
    return res.status(200).json(conversation);
  } catch (error) {
    console.error("Error in getOrCreateConversation controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteConversation = async (req, res) => {
  const { id: conversationId } = req.params;
  const { _id: currentUserId } = req.user;

  const session = await mongoose.startSession(); // Start a new session for the transaction

  try {
    await session.withTransaction(async () => {
      // 1. Find the conversation
      const conversation = await Conversation.findById(conversationId).session(session);

      if (!conversation) {
        // Use throw inside a transaction to abort it
        throw new Error("Conversation not found");
      }

      // 2. Security check: ensure the user making the request is a participant
      if (!conversation.participants.includes(currentUserId)) {
        throw new Error("Unauthorized: You are not a participant of this conversation");
      }

      // 3. Identify the other participant
      const otherUserId = conversation.participants.find((p) => !p.equals(currentUserId));

      if (!otherUserId) {
        // This case handles group chats or corrupted data, good practice to have
        throw new Error("Could not identify the other participant");
      }

      // 4. Delete all messages within the conversation
      await Message.deleteMany({ conversationId: conversationId }).session(session);

      // 5. Unfollow logic: Remove users from each other's lists
      // currentUserId stops following otherUserId
      await User.findByIdAndUpdate(currentUserId, {
        $pull: { following: otherUserId },
      }).session(session);
      // otherUserId loses currentUserId as a follower
      await User.findByIdAndUpdate(otherUserId, {
        $pull: { followers: currentUserId },
      }).session(session);

      await User.findByIdAndUpdate(currentUserId, {
        $pull: { followers: otherUserId },
      }).session(session);
      // otherUserId loses currentUserId as a follower
      await User.findByIdAndUpdate(otherUserId, {
        $pull: { following: currentUserId },
      }).session(session);

      // 6. Finally, delete the conversation itself
      await Conversation.findByIdAndDelete(conversationId).session(session);
    });

    // If the transaction is successful, send a success response
    res.status(200).json({ message: "Conversation deleted successfully." });
  } catch (error) {
    console.error("Error in deleteConversation:", error.message);
    // Respond with a specific error message based on the error thrown in the transaction
    if (error.message === "Conversation not found") {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.startsWith("Unauthorized")) {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    // End the session
    await session.endSession();
  }
};
