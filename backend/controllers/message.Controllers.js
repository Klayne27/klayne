import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import { getReceiverSocketIds, io, emitUnreadMessageStatus } from "../lib/socket.js";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/user.model.js";

export const sendMessage = async (req, res) => {
  try {
    const {
      recipientId,
      message,
      conversationId: incomingConversationId,
      repliedTo,
    } = req.body;
    let { img } = req.body;
    const senderId = req.user._id;

    if (senderId.toString() === recipientId.toString()) {
      return res.status(400).json({ error: "You cannot message yourself." });
    }

    const recipientUser = await User.findById(recipientId);
    if (!recipientUser) {
      return res.status(404).json({ error: "Recipient user not found." });
    }

    let conversation;

    if (incomingConversationId) {
      conversation = await Conversation.findById(incomingConversationId);
      if (!conversation || !conversation.participants.includes(senderId)) {
        return res
          .status(403)
          .json({ error: "Unauthorized or invalid conversation ID." });
      }
    } else {
      conversation = await Conversation.findOne({
        participants: { $all: [senderId, recipientId] },
      });

      if (!conversation) {
        conversation = new Conversation({
          participants: [senderId, recipientId],
          lastMessage: null,
        });
        await conversation.save();
      }
    }

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
      seen: false,
      repliedTo: repliedTo || null,
    });

    await newMessage.save();

    conversation.lastMessage = {
      text: message || "",
      img: uploadedImgUrl,
      sender: senderId,
      seen: false,
      createdAt: newMessage.createdAt,
    };

    conversation.deletedFor = [];

    await conversation.save();

    await newMessage.populate("sender", "username profileImg fullName isVerified");

    if (newMessage.repliedTo) {
      await newMessage.populate("repliedTo", "sender text img");
      await newMessage.populate({
        path: "repliedTo",
        populate: {
          path: "sender",
          select: "username fullName profileImg isVerified",
        },
      });
    }

    const recipientSocketIds = getReceiverSocketIds(recipientId.toString());
    if (recipientSocketIds.length > 0) {
      recipientSocketIds.forEach((socketId) => {
        io.to(socketId).emit("newMessage", newMessage);
      });
    }

    const senderSocketIds = getReceiverSocketIds(senderId.toString());
    if (senderSocketIds.length > 0) {
      senderSocketIds.forEach((socketId) => {
        io.to(socketId).emit("newMessage", newMessage);
      });
    }

    await emitUnreadMessageStatus(recipientId.toString());
    await emitUnreadMessageStatus(senderId.toString());

    res.status(201).json({ newMessage, conversationId: conversation._id });
  } catch (error) {
    console.error("Error in sendMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const getMessagesByConversationId = async (req, res) => {
  const { conversationId } = req.params;
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
      // Mark individual messages as seen
      await Message.updateMany(
        { conversationId: conversation._id, sender: otherParticipantId, seen: false },
        { $set: { seen: true } }
      );

      // Only update lastMessage.seen if the last message was from the other participant and unseen
      if (
        conversation.lastMessage &&
        conversation.lastMessage.sender.toString() === otherParticipantId.toString() &&
        !conversation.lastMessage.seen
      ) {
        // Option 1: Use `{ timestamps: false }` to prevent `updatedAt` from changing
        // This is the cleanest fix if you only want to update `lastMessage.seen`
        await Conversation.updateOne(
          { _id: conversation._id },
          { $set: { "lastMessage.seen": true } },
          { timestamps: false }
        );
      }

      await emitUnreadMessageStatus(userId.toString());
      const recipientSocketIds = getReceiverSocketIds(otherParticipantId.toString());
      recipientSocketIds.forEach((socketId) => {
        io.to(socketId).emit("messagesSeen", {
          conversationId,
          readerId: userId.toString(),
        });
      });
      await emitUnreadMessageStatus(otherParticipantId.toString());
    }

    const messages = await Message.find({
      conversationId: conversation._id,
    })
      .sort({ createdAt: 1 })
      .populate("sender", "username profileImg fullName isVerified")
      .populate({
        path: "repliedTo",
        select: "sender text img",
        populate: {
          path: "sender",
          select: "username fullName profileImg isVerified",
        },
      })
      .sort({ createdAt: 1 }); // Duplicate sort, remove one if not needed

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessagesByConversationId controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const getConversations = async (req, res) => {
  const userId = req.user._id;

  try {
    const conversations = await Conversation.find({
      participants: userId,
      "participants.1": { $exists: true },
      "deletedFor.user": { $ne: userId },
    })
      .populate({
        path: "participants",
        select: "username profileImg fullName isVerified",
      })
      .sort({ updatedAt: -1 });

    const processedConversations = conversations
      .map((conversation) => {
        const validParticipants = conversation.participants.filter((p) => p && p._id);

        if (validParticipants.length < 2) {
          return null;
        }

        const otherParticipant = validParticipants.find(
          (participant) => participant._id.toString() !== userId.toString()
        );

        if (!otherParticipant) {
          return null;
        }

        const lastMessageData = conversation.lastMessage
          ? {
              text: conversation.lastMessage.text,
              sender: conversation.lastMessage.sender,
              seen: conversation.lastMessage.seen,
              createdAt: conversation.lastMessage.createdAt,
              img: conversation.lastMessage.img,
            }
          : null;

        return {
          _id: conversation._id,
          participants: [otherParticipant],
          lastMessage: lastMessageData,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        };
      })
      .filter(Boolean);

    res.status(200).json(processedConversations);
  } catch (error) {
    console.error("Error in getConversations controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const getFollowedUsersForMessaging = async (req, res) => {
  try {
    const userId = req.user._id;

    const currentUser = await User.findById(userId).populate({
      path: "following",
      select: "username profileImg fullName isVerified",
    });

    if (!currentUser) {
      return res.status(404).json({ error: "User not found." });
    }

    const followedUsers = currentUser.following.filter(Boolean);

    res.status(200).json(followedUsers);
  } catch (error) {
    console.error("Error in getFollowedUsersForMessaging controller:", error.message);
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

    if (messageToDelete.img) {
      const imgId = messageToDelete.img.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(imgId);
    }

    await Message.findByIdAndDelete(messageId);

    const conversation = await Conversation.findById(messageToDelete.conversationId);
    if (conversation) {
      if (
        conversation.lastMessage &&
        conversation.lastMessage.text === messageToDelete.text &&
        conversation.lastMessage.sender.toString() === messageToDelete.sender.toString()
      ) {
        const newLastMessage = await Message.findOne({ conversationId: conversation._id })
          .sort({ createdAt: -1 })
          .limit(1);

        if (newLastMessage) {
          conversation.lastMessage = {
            text: newLastMessage.text,
            img: newLastMessage.img,
            sender: newLastMessage.sender,
            seen: newLastMessage.seen,
            createdAt: newLastMessage.createdAt,
          };
        } else {
          conversation.lastMessage = null;
        }
        await conversation.save();
      }
    }

    const participants = conversation ? conversation.participants : [];
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

export const deleteConversationForUser = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    if (!conversation.participants.includes(userId)) {
      return res
        .status(403)
        .json({ error: "You are not a participant in this conversation" });
    }

    const isAlreadyDeletedForUser = conversation.deletedFor.some(
      (entry) => entry.user.toString() === userId.toString()
    ); 

    if (isAlreadyDeletedForUser) {
      return res
        .status(200)
        .json({ message: "Conversation already marked as deleted for this user" });
    }

    conversation.deletedFor.push({ user: userId });
    await conversation.save();

    await emitUnreadMessageStatus(userId.toString());

    res.status(200).json({ message: "Conversation deleted successfully" });
  } catch (error) {
    console.error("Error deleting conversation for user:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
