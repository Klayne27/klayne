import Notification from "../models/notification.model.js";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import Post from "../models/post.model.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import {
  createAndSendNotification,
  emitUnreadNotificationStatus,
} from "../lib/socket.js";
import mongoose from "mongoose";
import PublicChatMessage from "../models/publicMessage.model.js";
import { getBlockingUsers } from "../lib/utils/helpers.js";
import Image from "../models/image.model.js";
import { admin } from "../config/firebaseAdmin.js";
import LevelUp from "../models/levelup.model.js";
import StudySession from "../models/studySession.js";
import Todo from "../models/todo.model.js";
import TodoActivity from "../models/todoActivity.model.js";
import TodoList from "../models/todoList.model.js";

export const getUserProfile = async (req, res) => {
  const { username } = req.params;
  const currentUserId = req.user?._id;

  try {
    const user = await User.findOne({ username })
      .select("-password")
      .populate({
        path: "pinnedPosts",
        populate: {
          path: "user",
          select: "username fullName profileImg isVerified isGoldVerified badges",
        },
      })
      .populate("profileImg", "imageUrl") // Populate the profile image
      .populate("coverImg", "imageUrl"); // Populate the cover image

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let isBlockedByYou = false;
    let hasBlockedYou = false;

    if (currentUserId && currentUserId.toString() !== user._id.toString()) {
      const currentUser = await User.findById(currentUserId).select(
        "blockedUsers blockedBy"
      );

      if (currentUser) {
        isBlockedByYou = currentUser.blockedUsers.includes(user._id);
        hasBlockedYou = currentUser.blockedBy.includes(user._id);
      }
    }

    if (hasBlockedYou) {
      return res.status(403).json({
        error: "You are blocked by this user.",
        isBlockedByYou: false,
        hasBlockedYou: true,
        username: user.username,
        fullName: user.fullName,
        profileImg: user.profileImg,
        coverImg: user.coverImg,
        isVerified: user.isVerified,
        isGoldVerified: user.isGoldVerified,
      });
    }

    const profileData = {
      ...user.toObject(),
      isBlockedByYou: isBlockedByYou,
      hasBlockedYou: hasBlockedYou,
    };

    res.status(200).json(profileData);
  } catch (error) {
    console.log("Error in getUserProfile: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const followUnfollowUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userToModify = await User.findById(id);
    const currentUser = await User.findById(req.user._id);

    if (id === req.user._id.toString()) {
      return res.status(400).json({ error: "You can't follow/unfollow yourself" });
    }

    if (!userToModify || !currentUser) {
      return res.status(400).json({ error: "User not found" });
    }

    if (currentUser.blockedUsers.includes(userToModify._id)) {
      return res
        .status(400)
        .json({ error: "You have blocked this user. Unblock them to follow." });
    }
    if (userToModify.blockedUsers.includes(currentUser._id)) {
      return res
        .status(400)
        .json({ error: "This user has blocked you. You cannot follow them." });
    }

    const isFollowing = currentUser.following.includes(id);

    if (isFollowing) {
      // --- UNFOLLOW LOGIC ---
      await User.findByIdAndUpdate(id, { $pull: { followers: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $pull: { following: id } });

      await Conversation.updateOne(
        { participants: { $all: [req.user._id, id] } },
        { $addToSet: { hiddenFor: req.user._id } },
        { timestamps: false }
      );

      res.status(200).json({ message: "User unfollowed successfully" });
    } else {
      // --- FOLLOW LOGIC ---
      await User.findByIdAndUpdate(id, { $push: { followers: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $push: { following: id } });

      const existingConversation = await Conversation.findOne({
        participants: { $all: [req.user._id, id] },
      });

      if (existingConversation) {
        await Conversation.updateOne(
          { _id: existingConversation._id },
          { $pull: { hiddenFor: req.user._id } },
          { timestamps: false }
        );
      } else {
        const newConversation = new Conversation({
          participants: [req.user._id, id],
          hiddenFor: [userToModify._id],
        });
        await newConversation.save();
      }

      await createAndSendNotification({
        type: "follow",
        from: req.user._id,
        to: userToModify._id,
      });
      // --------------------------------------------------------------------

      res.status(200).json({ message: "User followed successfully" });
    }
  } catch (error) {
    console.log("Error in followUnfollowUser", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getSuggestedUsers = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(200).json([]);
    }

    const { blockedByMe, blockedMe } = await getBlockingUsers(userId);
    const blockedAndBlockingUsers = [...new Set([...blockedByMe, ...blockedMe])];

    const currentUserDoc = await User.findById(userId).select("following").lean();
    const usersFollowedByMe = currentUserDoc?.following?.map((id) => id.toString()) || [];

    const excludeUserIds = [
      new mongoose.Types.ObjectId(userId),
      ...usersFollowedByMe.map((id) => new mongoose.Types.ObjectId(id)),
      ...blockedAndBlockingUsers.map((id) => new mongoose.Types.ObjectId(id)),
    ];

    const suggestedUsers = await User.aggregate([
      {
        $match: {
          _id: { $nin: excludeUserIds },
          blockedBy: { $nin: [new mongoose.Types.ObjectId(userId)] },
        },
      },
      { $sample: { size: 4 } },
      { $limit: 4 },
      {
        $lookup: {
          from: "images", // Name of your image collection
          localField: "profileImg",
          foreignField: "_id",
          as: "profileImg",
        },
      },
      {
        $unwind: { path: "$profileImg", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          username: 1,
          fullName: 1,
          profileImg: 1,
          _id: 1,
          isVerified: 1,
          isGoldVerified: 1,
          badges: 1,
        },
      },
    ]);

    res.status(200).json(suggestedUsers);
  } catch (error) {
    console.error("Error in getSuggestedUsers: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateUser = async (req, res) => {
  const {
    fullName,
    email,
    username,
    currentPassword,
    newPassword,
    bio,
    link,
    confirmNewPassword,
  } = req.body;
  const { profileImg, coverImg } = req.body;

  const userId = req.user._id;

  try {
    // Fetch the user and populate the image fields to handle both old and new data types
    let user = await User.findById(userId)
      .populate("profileImg", "imageUrl")
      .populate("coverImg", "imageUrl");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (email !== undefined && email !== user.email) {
      const existingUserWithEmail = await User.findOne({ email });
      if (existingUserWithEmail) {
        return res.status(409).json({ error: "Email is already taken." });
      }
    }

    // Check if the new username is already taken by another user
    if (username !== undefined && username !== user.username) {
      const existingUserWithUsername = await User.findOne({ username });
      if (existingUserWithUsername) {
        return res.status(409).json({ error: "Username is already taken." });
      }
    }

    // --- Password and Validation Logic ---
    if ((newPassword && !currentPassword) || (!newPassword && currentPassword)) {
      return res
        .status(400)
        .json({ error: "Please provide both current and new password" });
    }

    if (newPassword && currentPassword) {
      if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ error: "New passwords do not match" });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters long" });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    // --- Profile Image Logic ---
    if (profileImg !== undefined) {
      if (user.profileImg) {
        // Delete existing image from Cloudinary and the database
        const publicId = user.profileImg.imageUrl.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
        await Image.findByIdAndDelete(user.profileImg._id);
      }

      if (profileImg === "") {
        // If the new image is an empty string, just set the user reference to null
        user.profileImg = null;
      } else {
        // Otherwise, upload the new image and create a new Image document
        const uploadedResponse = await cloudinary.uploader.upload(profileImg);
        const newProfileImage = await Image.create({
          imageUrl: uploadedResponse.secure_url,
          parentDocument: userId,
          parentModel: "User",
          uploadedBy: userId,
        });
        user.profileImg = newProfileImage._id;
      }
    }

    // --- Cover Image Logic ---
    if (coverImg !== undefined) {
      if (user.coverImg) {
        const publicId = user.coverImg.imageUrl.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
        await Image.findByIdAndDelete(user.coverImg._id);
      }

      if (coverImg === "") {
        user.coverImg = null;
      } else {
        const uploadedResponse = await cloudinary.uploader.upload(coverImg);
        const newCoverImage = await Image.create({
          imageUrl: uploadedResponse.secure_url,
          parentDocument: userId,
          parentModel: "User",
          uploadedBy: userId,
        });
        user.coverImg = newCoverImage._id;
      }
    }

    // Update other user fields
    if (fullName !== undefined) user.fullName = fullName;
    if (email !== undefined) user.email = email;
    if (username !== undefined) user.username = username;
    if (bio !== undefined) user.bio = bio;
    if (link !== undefined) user.link = link;

    await user.save();

    // Re-fetch the user to ensure all fields, including the new images, are populated
    const updatedUser = await User.findById(userId)
      .populate("profileImg", "imageUrl")
      .populate("coverImg", "imageUrl")
      .select("-password");

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error in updateUser: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getFollowingUsers = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate({
      path: "following",
      select: "username fullName isVerified isGoldVerified badges",
      populate: {
        path: "profileImg",
        select: "imageUrl",
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user.following); // <--- CHANGE HERE
  } catch (error) {
    console.log("Error in getFollowingUsers: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getFollowers = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate({
      path: "followers",
      select: "username fullName isVerified isGoldVerified badges",
      populate: {
        path: "profileImg",
        select: "imageUrl",
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user.followers);
  } catch (error) {
    console.log("Error in getFollowers: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteUserAccount = async (req, res) => {
  try {
    const { id } = req.params;
    if (id !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ error: "You are not authorized to delete this account." });
    }
    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      return res.status(404).json({ error: "User not found." });
    }
    if (userToDelete.firebaseUid) {
      await admin.auth().deleteUser(userToDelete.firebaseUid);
    } // 1. Find all images uploaded by the user to delete from Cloudinary and the database

    const userImages = await Image.find({ uploadedBy: userToDelete._id });
    for (const image of userImages) {
      const publicId = image.imageUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }
    await Image.deleteMany({ uploadedBy: userToDelete._id }); // 2. Find and delete user's posts, including any associated videos

    const userPosts = await Post.find({ user: userToDelete._id });
    for (const post of userPosts) {
      if (post.video) {
        const videoId = post.video.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(videoId, { resource_type: "video" });
      }
      await Post.findByIdAndDelete(post._id);
    } // ⭐ NEW STEP: 3. Delete all data from new schemas associated with the user ⭐

    await LevelUp.deleteMany({ user: id });
    await PushSubscription.deleteMany({ userId: id });
    await StudySession.deleteMany({ user: id });
    await Todo.deleteMany({ user: id });
    await TodoActivity.deleteMany({ user: id });
    await TodoList.deleteMany({ owner: id });

    await User.updateMany(
      { $or: [{ blockedUsers: id }, { blockedBy: id }] },
      { $pull: { blockedUsers: id, blockedBy: id } }
    );
    await Post.updateMany({ likes: id }, { $pull: { likes: id } });
    await Post.updateMany({ "comments.user": id }, { $pull: { comments: { user: id } } });
    await User.updateMany(
      { $or: [{ following: id }, { followers: id }] },
      { $pull: { following: id, followers: id } }
    );
    await Notification.deleteMany({ $or: [{ from: id }, { to: id }] });
    await PublicChatMessage.deleteMany({ sender: id }); // 5. Delete messages and conversations
    await PublicChatMessage.updateMany({}, { $pull: { reactions: { userId: id } } });

    const conversationsToDelete = await Conversation.find({ participants: id });
    const conversationIds = conversationsToDelete.map((conv) => conv._id);
    await Message.deleteMany({ conversationId: { $in: conversationIds } });
    await Conversation.deleteMany({ _id: { $in: conversationIds } }); // 6. Finally, delete the user document

    await User.findByIdAndDelete(id);

    res.status(200).json({
      message: "Account deleted successfully. All associated data has been removed.",
    });
  } catch (error) {
    console.error("Error in deleteUserAccount: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(200).json([]);
    }

    const users = await User.find({
      $or: [
        { username: { $regex: `^${q}`, $options: "i" } },
        { fullName: { $regex: `^${q}`, $options: "i" } },
      ],
    })
      .select("-password")
      .populate("profileImg", "imageUrl") // Add this population
      .limit(5);

    res.status(200).json(users);
  } catch (error) {
    console.error("Error in searchUsers controller:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const blockUnblockUser = async (req, res) => {
  try {
    const { id: userToBlockId } = req.params;
    const currentUserId = req.user._id;

    if (userToBlockId.toString() === currentUserId.toString()) {
      return res.status(400).json({ error: "You cannot block yourself." });
    }

    const currentUser = await User.findById(currentUserId);
    const userToBlock = await User.findById(userToBlockId);

    if (!currentUser || !userToBlock) {
      return res.status(404).json({ error: "User not found." });
    }

    const isCurrentlyBlocked = currentUser.blockedUsers.includes(userToBlockId);

    if (isCurrentlyBlocked) {
      await User.findByIdAndUpdate(currentUserId, {
        $pull: { blockedUsers: userToBlockId },
      });
      await User.findByIdAndUpdate(userToBlockId, {
        $pull: { blockedBy: currentUserId },
      });

      return res.status(200).json({
        message: "User unblocked successfully.",
        username: userToBlock.username,
        isBlockedByYou: false,
        hasBlockedYou: userToBlock.blockedBy.includes(currentUserId),
      });
    } else {
      await User.findByIdAndUpdate(currentUserId, {
        $push: { blockedUsers: userToBlockId },
      });
      await User.findByIdAndUpdate(userToBlockId, {
        $push: { blockedBy: currentUserId },
      });

      const currentUserWasFollowing = currentUser.following.includes(userToBlockId);
      const userToBlockWasFollowing = userToBlock.following.includes(currentUserId);

      if (currentUserWasFollowing) {
        await User.findByIdAndUpdate(currentUserId, {
          $pull: { following: userToBlockId },
        });
        await User.findByIdAndUpdate(userToBlockId, {
          $pull: { followers: currentUserId },
        });
      }
      if (userToBlockWasFollowing) {
        await User.findByIdAndUpdate(userToBlockId, {
          $pull: { following: currentUserId },
        });
        await User.findByIdAndUpdate(currentUserId, {
          $pull: { followers: userToBlockId },
        });
      }

      return res.status(200).json({
        message: "User blocked successfully.",
        username: userToBlock.username,
        isBlockedByYou: true,
        hasBlockedYou: userToBlock.blockedBy.includes(currentUserId),
      });
    }
  } catch (error) {
    console.error("Error in blockUnblockUser: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const adminDeleteUserAccount = async (req, res) => {
  try {
    // 1. Authorization check
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({
        error: "Forbidden: Only administrators can delete other user accounts.",
      });
    }

    const { id: userIdToDelete } = req.params;

    const userToDelete = await User.findById(userIdToDelete);
    if (!userToDelete) {
      return res.status(404).json({ error: "User not found." });
    }

    if (userIdToDelete === req.user._id.toString()) {
      return res.status(400).json({
        error: "Please use the 'Delete My Account' option to delete your own account.",
      });
    }

    if (userToDelete.firebaseUid) {
      await admin.auth().deleteUser(userToDelete.firebaseUid);
    } // 2. Delete all images associated with the user from Cloudinary and the database

    const userImages = await Image.find({ uploadedBy: userIdToDelete });
    for (const image of userImages) {
      const publicId = image.imageUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }
    await Image.deleteMany({ uploadedBy: userIdToDelete }); // 3. Find and delete user's posts and their videos

    const userPosts = await Post.find({ user: userIdToDelete });
    for (const post of userPosts) {
      if (post.video) {
        const videoId = post.video.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(videoId, { resource_type: "video" });
      }
      await Post.findByIdAndDelete(post._id);
    } // ⭐ NEW STEP: 4. Delete all data from new schemas associated with the user ⭐

    await LevelUp.deleteMany({ user: userIdToDelete });
    await PushSubscription.deleteMany({ userId: userIdToDelete });
    await StudySession.deleteMany({ user: userIdToDelete });
    await Todo.deleteMany({ user: userIdToDelete });
    await TodoActivity.deleteMany({ user: userIdToDelete });
    await TodoList.deleteMany({ owner: userIdToDelete }); // ⭐ Crucial step to remove user's reactions from all public chat messages. ⭐

    await User.updateMany(
      { $or: [{ blockedUsers: userIdToDelete }, { blockedBy: userIdToDelete }] },
      { $pull: { blockedUsers: userIdToDelete, blockedBy: userIdToDelete } }
    );
    await Post.updateMany(
      { likes: userIdToDelete },
      { $pull: { likes: userIdToDelete } }
    );
    await Post.updateMany(
      { "comments.user": userIdToDelete },
      { $pull: { comments: { user: userIdToDelete } } }
    );
    await User.updateMany(
      { $or: [{ following: userIdToDelete }, { followers: userIdToDelete }] },
      { $pull: { following: userIdToDelete, followers: userIdToDelete } }
    );
    await Notification.deleteMany({
      $or: [{ from: userIdToDelete }, { to: userIdToDelete }],
    });
    await PublicChatMessage.deleteMany({ sender: userIdToDelete }); // 6. Delete messages and conversations
    await PublicChatMessage.updateMany(
      {},
      { $pull: { reactions: { userId: userIdToDelete } } }
    );
    
    const conversationsToDelete = await Conversation.find({
      participants: userIdToDelete,
    });
    const conversationIds = conversationsToDelete.map((conv) => conv._id);
    await Message.deleteMany({ conversationId: { $in: conversationIds } });
    await Conversation.deleteMany({ _id: { $in: conversationIds } }); // 7. Finally, delete the user document

    await User.findByIdAndDelete(userIdToDelete);

    res.status(200).json({
      message: `Account of ${userToDelete.username} deleted successfully. All associated data has been removed.`,
    });
  } catch (error) {
    console.error("Error in adminDeleteUserAccount: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
