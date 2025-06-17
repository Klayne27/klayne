import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import { getReceiverSocketIds, io } from "../lib/socket.js";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/user.model.js";

export const sendMessage = async (req, res) => {
  try {
    const { recipientId, message } = req.body;
    let { img } = req.body;
    const senderId = req.user._id;

    if (senderId.toString() === recipientId.toString()) {
      return res.status(400).json({ error: "You cannot message yourself." });
    }

    const recipientUser = await User.findById(recipientId);
    if (!recipientUser) {
      return res.status(404).json({ error: "Recipient user not found." });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, recipientId] },
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [senderId, recipientId],
        lastMessage: {
          text: message,
          sender: senderId,
          seen: false,
          createdAt: new Date(),
        },
      });
      await conversation.save();
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
    });

    await newMessage.save();

    conversation.lastMessage = {
      text: message || "",
      img: uploadedImgUrl,
      sender: senderId,
      seen: false,
      createdAt: newMessage.createdAt,
    };

    await conversation.save();

    await newMessage.populate("sender", "username profilePic fullName");

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

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const getMessages = async (req, res) => {
  const { otherUserId } = req.params;
  const userId = req.user._id;

  try {
    if (userId.toString() === otherUserId.toString()) {
      return res
        .status(400)
        .json({ error: "Cannot get messages with yourself this way." });
    }

    const conversation = await Conversation.findOne({
      participants: { $all: [userId, otherUserId] },
    });

    if (!conversation) {
      return res.status(200).json([]);
    }

    const messages = await Message.find({
      conversationId: conversation._id,
    })
      .sort({ createdAt: 1 })
      .populate("sender", "username profileImg");

    await Message.updateMany(
      { conversationId: conversation._id, sender: otherUserId, seen: false },
      { $set: { seen: true } }
    );
    if (
      conversation.lastMessage &&
      conversation.lastMessage.sender.toString() === otherUserId.toString()
    ) {
      await Conversation.updateOne(
        { _id: conversation._id },
        { $set: { "lastMessage.seen": true } }
      );
    }

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages controller:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};

export const getConversations = async (req, res) => {
  const userId = req.user._id;

  try {
    const conversations = await Conversation.find({ participants: userId })
      .populate({
        path: "participants",
        select: "username profileImg fullName",
      })
      .sort({ updatedAt: -1 });

    const processedConversations = conversations
      .map((conversation) => {
        const otherParticipant = conversation.participants.find(
          (participant) => participant && participant._id.toString() !== userId.toString()
        );

        if (!otherParticipant) {
          console.warn(
            `Conversation ${conversation._id} has no other participant for user ${userId}`
          );
          return null;
        }

        const lastMessageData = conversation.lastMessage
          ? {
              text: conversation.lastMessage.text,
              sender: conversation.lastMessage.sender,
              seen: conversation.lastMessage.seen,
              createdAt: conversation.lastMessage.createdAt,
              img: conversation.lastMessage.img,
              updatedAt: conversation.updatedAt,
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
      select: "username profileImg fullName",
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
