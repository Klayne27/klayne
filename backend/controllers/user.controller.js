import Notification from "../models/notification.model.js";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import Post from "../models/post.model.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import { createAndSendNotification } from "../lib/socket.js";
import mongoose from "mongoose";
import PublicChatMessage from "../models/publicMessage.model.js";
import { getBlockingUsers } from "../lib/utils/helpers.js";
import Image from "../models/image.model.js";
import { admin } from "../config/firebaseAdmin.js";
import PushSubscription from "../models/pushSubscription.js";
import DevlogComment from "../models/devlogComment.model.js";
import Devlog from "../models/devlog.model.js";
import BoardPost from "../models/boardPost.model.js";
import BoardComment from "../models/boardComment.model.js";

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
          select:
            "username fullName profileImg isVerified isGoldVerified  badges preferredBadge",
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
        "blockedUsers blockedBy",
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

export const getFollowingUsers = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).populate({
      path: "following",
      select: "username fullName isVerified isGoldVerified  badges preferredBadge",
      populate: {
        path: "profileImg",
        select: "imageUrl",
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user.following);
  } catch (error) {
    console.log("Error in getFollowingUsers: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).populate({
      path: "followers",
      select: "username fullName isVerified isGoldVerified  badges preferredBadge",
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

export const followUnfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const userToModify = await User.findById(userId);
    const currentUser = await User.findById(req.user._id);

    if (userId === req.user._id.toString()) {
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

    const isFollowing = currentUser.following.includes(userId);

    if (isFollowing) {
      // --- UNFOLLOW LOGIC ---
      await User.findByIdAndUpdate(userId, { $pull: { followers: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $pull: { following: userId } });

      await Conversation.updateOne(
        { participants: { $all: [req.user._id, userId] } },
        { $addToSet: { hiddenFor: req.user._id } },
        { timestamps: false },
      );

      res.status(200).json({ message: "User unfollowed successfully" });
    } else {
      // --- FOLLOW LOGIC ---
      await User.findByIdAndUpdate(userId, { $push: { followers: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $push: { following: userId } });

      const existingConversation = await Conversation.findOne({
        participants: { $all: [req.user._id, userId] },
      });

      if (existingConversation) {
        await Conversation.updateOne(
          { _id: existingConversation._id },
          { $pull: { hiddenFor: req.user._id } },
          { timestamps: false },
        );
      } else {
        const newConversation = new Conversation({
          participants: [req.user._id, userId],
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
          preferredBadge: 1,
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
    currentPassword,
    newPassword,
    bio,
    link,
    confirmNewPassword,
    relationshipStatus,
    levelOfEducation, // Added
    majorOrField, // Added
  } = req.body;
  let { username } = req.body;
  const { profileImg, coverImg } = req.body;

  const userId = req.user._id;

  try {
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

    if (username !== undefined && username !== user.username) {
      username = username.trim();

      const endsWithSpecialChar = /[^a-zA-Z0-9]$/;
      if (endsWithSpecialChar.test(username)) {
        return res
          .status(400)
          .json({ error: "Handle must end with a letter or a number." });
      }

      const existingUserWithUsername = await User.findOne({ username });
      if (existingUserWithUsername) {
        return res.status(409).json({ error: "Handle is already taken." });
      }
    }

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
    } // --- Profile Image Logic --- // Check if profileImg is a non-empty string before processing

    if (profileImg || profileImg === "") {
      if (user.profileImg) {
        const publicId = user.profileImg.imageUrl.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
        await Image.findByIdAndDelete(user.profileImg._id);
      }

      if (profileImg === "") {
        user.profileImg = null;
      } else {
        // No need for 'else if (profileImg)' because the outer 'if' already guarantees it
        const uploadedResponse = await cloudinary.uploader.upload(profileImg, {
          upload_preset: "ml_avatars",
        });
        const newProfileImage = await Image.create({
          imageUrl: uploadedResponse.secure_url,
          parentDocument: userId,
          parentModel: "User",
          uploadedBy: userId,
        });
        user.profileImg = newProfileImage._id;
      }
    }

    if (coverImg || coverImg === "") {
      if (user.coverImg) {
        const publicId = user.coverImg.imageUrl.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
        await Image.findByIdAndDelete(user.coverImg._id);
      }

      if (coverImg === "") {
        user.coverImg = null;
      } else {
        const uploadedResponse = await cloudinary.uploader.upload(coverImg, {
          upload_preset: "ml_covers",
        });
        const newCoverImage = await Image.create({
          imageUrl: uploadedResponse.secure_url,
          parentDocument: userId,
          parentModel: "User",
          uploadedBy: userId,
        });
        user.coverImg = newCoverImage._id;
      }
    }

    if (fullName !== undefined) user.fullName = fullName;
    if (email !== undefined) user.email = email;
    if (username !== undefined) user.username = username;
    if (bio !== undefined) user.bio = bio;
    if (link !== undefined) user.link = link;

    if (relationshipStatus !== undefined) {
      user.relationshipStatus = relationshipStatus;
    }

    if (levelOfEducation !== undefined) user.levelOfEducation = levelOfEducation;
    if (majorOrField !== undefined) user.majorOrField = majorOrField;

    await user.save(); // Re-fetch the user to ensure all fields, including the new images, are populated

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

export const deleteUserAccount = async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId !== req.user._id.toString()) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const userToDelete = await User.findById(userId);
    if (!userToDelete) return res.status(404).json({ error: "User not found." });

    // --- STEP 1: CALCULATE REPLIES BEFORE DELETING POSTS ---
    const userReplies = await Post.find({ user: userId, parentPost: { $ne: null } });
    const replyCountsPerPost = userReplies.reduce((acc, reply) => {
      const parentId = reply.parentPost.toString();
      acc[parentId] = (acc[parentId] || 0) + 1;
      return acc;
    }, {});

    const replyUpdatePromises = Object.keys(replyCountsPerPost).map((parentId) =>
      Post.findByIdAndUpdate(parentId, {
        $inc: { repliesCount: -replyCountsPerPost[parentId] },
      }),
    );
    await Promise.all(replyUpdatePromises);

    // --- STEP 2: CALCULATE DEVLOG COMMENTS ---
    const userDevlogComments = await DevlogComment.find({ author: userId });
    if (userDevlogComments.length > 0) {
      const commentsPerDevlog = userDevlogComments.reduce((acc, comment) => {
        const devlogId = comment.devlog.toString();
        acc[devlogId] = (acc[devlogId] || 0) + 1;
        return acc;
      }, {});

      const devlogUpdatePromises = Object.keys(commentsPerDevlog).map((devlogId) =>
        Devlog.findByIdAndUpdate(devlogId, {
          $inc: { commentsCount: -commentsPerDevlog[devlogId] },
        }),
      );
      await Promise.all(devlogUpdatePromises);
    }

    // --- STEP 3: REPOSTS COUNT FIX ---
    // Instead of -1, we should decrement by the actual number of reposts the user has
    // but updateMany with $inc -1 works if the user can only repost a post once.
    await Post.updateMany(
      { repostedBy: userId },
      { $pull: { repostedBy: userId }, $inc: { repostsCount: -1 } },
    );

    const userImages = await Image.find({ uploadedBy: userId });
    for (const image of userImages) {
      const publicId = image.imageUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }

    // --- STEP 4: MEDIA CLEANUP (Cloudinary) ---
    const userPosts = await Post.find({ user: userId });
    for (const post of userPosts) {
      if (post.video) {
        const videoId = post.video.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(videoId, { resource_type: "video" });
      }
      // If you have image public IDs, delete them here too
    }

    // --- STEP 5: DELETE ACTUAL RECORDS ---
    await Post.deleteMany({ user: userId });
    await DevlogComment.deleteMany({ author: userId });
    await Image.deleteMany({ uploadedBy: userId });
    await PushSubscription.deleteMany({ userId: userId });
    await Notification.deleteMany({ $or: [{ from: userId }, { to: userId }] });
    await PublicChatMessage.deleteMany({ sender: userId });
    await BoardPost.deleteMany({ user: userId });
    await BoardComment.deleteMany({ user: userId });

    // --- STEP 6: ARRAY CLEANUP (Likes/Follows) ---
    await Post.updateMany(
      { $or: [{ likes: userId }, { bookmarkedBy: userId }] },
      { $pull: { likes: userId, bookmarkedBy: userId } },
    );
    await Devlog.updateMany({ likes: userId }, { $pull: { likes: userId } });
    await User.updateMany(
      {
        $or: [
          { following: userId },
          { followers: userId },
          { blockedUsers: userId },
          { blockedBy: userId },
        ],
      },
      {
        $pull: {
          following: userId,
          followers: userId,
          blockedUsers: userId,
          blockedBy: userId,
        },
      },
    );

    // Final Account Deletion
    if (userToDelete.firebaseUid) await admin.auth().deleteUser(userToDelete.firebaseUid);
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "Account deleted successfully." });
  } catch (error) {
    console.error("Delete error:", error);
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
    const { userToBlockId } = req.params;
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

    const { userIdToDelete } = req.params;

    const userToDelete = await User.findById(userIdToDelete);
    if (!userToDelete) {
      return res.status(404).json({ error: "User not found." });
    }

    if (userIdToDelete === req.user._id.toString()) {
      return res.status(400).json({
        error: "Please use the 'Delete My Account' option to delete your own account.",
      });
    }

    // --- STEP A: CALCULATE REPLIES BEFORE DELETING POSTS ---
    const userReplies = await Post.find({
      user: userIdToDelete,
      parentPost: { $ne: null },
    });
    const replyCountsPerPost = userReplies.reduce((acc, reply) => {
      const parentId = reply.parentPost.toString();
      acc[parentId] = (acc[parentId] || 0) + 1;
      return acc;
    }, {});

    const replyUpdatePromises = Object.keys(replyCountsPerPost).map((parentId) =>
      Post.findByIdAndUpdate(parentId, {
        $inc: { repliesCount: -replyCountsPerPost[parentId] },
      }),
    );
    await Promise.all(replyUpdatePromises);

    // --- STEP B: CALCULATE DEVLOG COMMENTS BEFORE DELETING ---
    const userDevlogComments = await DevlogComment.find({ author: userIdToDelete });
    if (userDevlogComments.length > 0) {
      const commentsPerDevlog = userDevlogComments.reduce((acc, comment) => {
        const devlogId = comment.devlog.toString();
        acc[devlogId] = (acc[devlogId] || 0) + 1; // Fixed: Use devlogId as key
        return acc;
      }, {});

      const devlogUpdatePromises = Object.keys(commentsPerDevlog).map((devlogId) =>
        Devlog.findByIdAndUpdate(devlogId, {
          $inc: { commentsCount: -commentsPerDevlog[devlogId] },
        }),
      );
      await Promise.all(devlogUpdatePromises);
    }

    // --- STEP C: CLEANUP REPOST COUNTS ---
    await Post.updateMany(
      { repostedBy: userIdToDelete },
      { $pull: { repostedBy: userIdToDelete }, $inc: { repostsCount: -1 } },
    );

    // --- STEP D: MEDIA CLEANUP (Cloudinary) ---
    const userImages = await Image.find({ uploadedBy: userIdToDelete });
    for (const image of userImages) {
      const publicId = image.imageUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }

    const userPosts = await Post.find({ user: userIdToDelete });
    for (const post of userPosts) {
      if (post.video) {
        const videoId = post.video.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(videoId, { resource_type: "video" });
      }
    }

    // --- STEP E: MASS DELETE ACTUAL RECORDS ---
    await Image.deleteMany({ uploadedBy: userIdToDelete });
    await Post.deleteMany({ user: userIdToDelete });
    await DevlogComment.deleteMany({ author: userIdToDelete });
    await PushSubscription.deleteMany({ userId: userIdToDelete });
    await Notification.deleteMany({
      $or: [{ from: userIdToDelete }, { to: userIdToDelete }],
    });
    await PublicChatMessage.deleteMany({ sender: userIdToDelete });
    await DevlogComment.deleteMany({ author: userIdToDelete });
    await BoardPost.deleteMany({ user: userIdToDelete });
    await BoardComment.deleteMany({ user: userIdToDelete });

    // --- STEP F: ARRAY CLEANUP (Likes, Bookmarks, Follows, Blocks) ---
    await Post.updateMany(
      {
        $or: [
          { likes: userIdToDelete },
          { bookmarkedBy: userIdToDelete },
          { mentionedUsers: userIdToDelete },
        ],
      },
      {
        $pull: {
          likes: userIdToDelete,
          bookmarkedBy: userIdToDelete,
          mentionedUsers: userIdToDelete,
        },
      },
    );
    await Devlog.updateMany(
      { likes: userIdToDelete },
      { $pull: { likes: userIdToDelete } },
    );
    await DevlogComment.updateMany(
      { $or: [{ likes: userIdToDelete }, { dislikes: userIdToDelete }] },
      { $pull: { likes: userIdToDelete, dislikes: userIdToDelete } },
    );
    await User.updateMany(
      {
        $or: [
          { following: userIdToDelete },
          { followers: userIdToDelete },
          { blockedUsers: userIdToDelete },
          { blockedBy: userIdToDelete },
        ],
      },
      {
        $pull: {
          following: userIdToDelete,
          followers: userIdToDelete,
          blockedUsers: userIdToDelete,
          blockedBy: userIdToDelete,
        },
      },
    );
    await PublicChatMessage.updateMany(
      {},
      { $pull: { reactions: { userId: userIdToDelete } } },
    );

    // --- STEP G: MESSAGES & CONVERSATIONS ---
    const conversationsToDelete = await Conversation.find({
      participants: userIdToDelete,
    });
    const conversationIds = conversationsToDelete.map((conv) => conv._id);
    await Message.deleteMany({ conversationId: { $in: conversationIds } });
    await Conversation.deleteMany({ _id: { $in: conversationIds } });

    // --- STEP H: FIREBASE & USER DOCUMENT ---
    if (userToDelete.firebaseUid) {
      await admin.auth().deleteUser(userToDelete.firebaseUid);
    }
    await User.findByIdAndDelete(userIdToDelete);

    res.status(200).json({
      message: `Account of ${userToDelete.username} and all associated data deleted successfully.`,
    });
  } catch (error) {
    console.error("Error in adminDeleteUserAccount: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const toggleLikedFeedPrivacy = async (req, res) => {
  try {
    const userId = req.user._id;
    const { isPrivate } = req.body;

    if (typeof isPrivate !== "boolean") {
      return res.status(400).json({ error: "Invalid value for isPrivate" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.isLikedFeedPrivate = isPrivate;
    await user.save();

    res.status(200).json({
      message: "Liked feed privacy updated successfully",
      isLikedFeedPrivate: user.isLikedFeedPrivate,
    });
  } catch (error) {
    console.error("Error toggling liked feed privacy:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateStatusPreference = async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.user._id;

    if (!["online", "offline"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { statusPreference: status },
      { new: true, select: "-password" }, // new:true returns the updated doc, select excludes the password
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found." });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating status preference:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getVacationModeStatus = async (req, res) => {
  try {
    // Select both fields
    const user = await User.findById(req.user.id).select(
      "isVacationMode vacationModeStartDate",
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Return both fields in the response
    res.json({
      isVacationMode: user.isVacationMode,
      vacationModeStartDate: user.vacationModeStartDate,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
export const toggleVacationMode = async (req, res) => {
  try {
    const { isVacationMode } = req.body;
    if (typeof isVacationMode !== "boolean") {
      return res.status(400).json({ message: "Invalid value for isVacationMode" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isVacationMode = isVacationMode;

    // If turning vacation mode ON, set the start date.
    if (isVacationMode) {
      user.vacationModeStartDate = new Date();
    }
    // IMPORTANT: Do not set it to null when turning it OFF here.
    // The endStudySession controller will handle that when the vacation is "used".

    await user.save();

    res.json({
      message: "Vacation mode updated successfully",
      isVacationMode: user.isVacationMode,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const updatePreferredBadge = async (req, res) => {
  const { preferredBadge } = req.body;
  const userId = req.user._id;

  try {
    // Find the user and check if the badge is valid
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    } // Validate that the preferredBadge is one of the user's earned badges or null

    if (
      preferredBadge !== null &&
      preferredBadge !== "" &&
      !user.badges.includes(preferredBadge)
    ) {
      return res
        .status(400)
        .json({ error: "You cannot select a badge you have not earned." });
    } // Update the field

    user.preferredBadge = preferredBadge;
    await user.save();

    res.status(200).json({ message: "Preferred badge updated successfully." });
  } catch (error) {
    console.error("Error updating preferred badge:", error.message);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
};
