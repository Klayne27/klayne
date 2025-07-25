import Notification from "../models/notification.model.js";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import Post from "../models/post.model.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import { emitUnreadNotificationStatus } from "../lib/socket.js";
import mongoose from "mongoose";
import PublicChatMessage from "../models/publicMessage.model.js";

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
          select: "username fullName profileImg isVerified isGoldVerified",
        },
      });

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
        isBlockedByYou = currentUser.blockedUsers.includes(user._id); // Check if the current user is in the profile owner's blockedBy list // (This means the profile owner has blocked the current user
        hasBlockedYou = currentUser.blockedBy.includes(user._id);
      }
    }

    if (hasBlockedYou) {
      return res.status(403).json({
        error: "You are blocked by this user.",
        isBlockedByYou: false, // You haven't blocked them
        hasBlockedYou: true, // They have blocked you
        username: user.username,
        fullName: user.fullName,
        profileImg: user.profileImg,
        coverImg: user.coverImg, // Include coverImg for header display
        isVerified: user.isVerified, // Include isVerified
        isGoldVerified: user.isGoldVerified,
      });
    } // If isBlockedByYou, you (the current user) have blocked this user. // In this case, you might still want to see the basic profile info but // restrict access to some content or interactions. // The current logic passes isBlockedByYou in profileData, which is fine.

    const profileData = {
      ...user.toObject(), // Convert Mongoose document to a plain JavaScript object
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
    const userToModify = await User.findById(id); // User B
    const currentUser = await User.findById(req.user._id); // User A

    if (id === req.user._id.toString()) {
      return res.status(400).json({ error: "You can't follow/unfollow yourself" });
    }

    if (!userToModify || !currentUser) {
      return res.status(400).json({ error: "User not found" });
    }

    // Block checks are still important and should remain
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

      // Optional: If you want to hide the conversation for the unfollowing user (User A)
      // upon unfollow, you can add them to the hiddenFor array here.
      // Or, as before, you can delete it. For now, we'll leave it.

      res.status(200).json({ message: "User unfollowed successfully" });
    } else {
      // --- FOLLOW LOGIC ---
      await User.findByIdAndUpdate(id, { $push: { followers: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $push: { following: id } });

      // ✨ Automatically create a conversation if it doesn't exist
      const existingConversation = await Conversation.findOne({
        participants: { $all: [req.user._id, id] },
      });

      if (existingConversation) {
        // ✨ If it exists, unhide it for the current user (User A)
        await Conversation.updateOne(
          { _id: existingConversation._id },
          { $pull: { hiddenFor: req.user._id } }, // Remove currentUser (A) from hiddenFor
          { timestamps: false }
        );
        // Ensure userToModify (B) remains in hiddenFor if they were there
        await Conversation.updateOne(
          { _id: existingConversation._id },
          { $addToSet: { hiddenFor: userToModify._id } }, // Add userToModify (B) to hiddenFor if not already there
          { timestamps: false }
        );
      } else {
        // If it doesn't exist, create it
        const newConversation = new Conversation({
          participants: [req.user._id, id],
          hiddenFor: [userToModify._id], // ✨ NEW: Hide it for the followed user (User B)
        });
        await newConversation.save();
      }

      // Your existing notification logic
      const newNotification = new Notification({
        type: "follow",
        from: req.user._id,
        to: userToModify._id,
      });
      await newNotification.save();
      await emitUnreadNotificationStatus(userToModify._id.toString());

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
        $project: {
          username: 1,
          fullName: 1,
          profileImg: 1,
          _id: 1,
          isVerified: 1,
          isGoldVerified: 1,
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
  const { fullName, email, username, currentPassword, newPassword, bio, link, confirmNewPassword } = req.body;
  let { profileImg, coverImg } = req.body;

  const userId = req.user._id;

  try {
    let user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if ((!newPassword && currentPassword) || (!currentPassword && newPassword)) {
      return res
        .status(400)
        .json({ error: "Please provide both current password and new password" });
    }

    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res
          .status(409)
          .json({ error: "Username already taken. Please choose a different one." });
      }
    }

    if (currentPassword && newPassword) {
      // New: Check if newPassword matches confirmNewPassword
      if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ error: "New passwords do not match" });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch)
        return res.status(400).json({ error: "Current password is incorrect" });
      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters long" });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }


    if (profileImg) {
      if (user.profileImg) {
        await cloudinary.uploader.destroy(user.profileImg.split("/").pop().split(".")[0]);
      }

      const uploadedResponse = await cloudinary.uploader.upload(profileImg);
      profileImg = uploadedResponse.secure_url;
    }

    if (coverImg) {
      if (user.coverImg) {
        await cloudinary.uploader.destroy(user.coverImg.split("/").pop().split(".")[0]);
      }

      const uploadedResponse = await cloudinary.uploader.upload(coverImg);
      coverImg = uploadedResponse.secure_url;
    }

    if (fullName !== undefined) user.fullName = fullName;
    if (email !== undefined) user.email = email;
    if (username !== undefined) user.username = username;

    if (bio !== undefined) user.bio = bio;
    if (link !== undefined) user.link = link;

    if (profileImg !== undefined) user.profileImg = profileImg; // This will be the new URL or undefined if not provided
    if (coverImg !== undefined) user.coverImg = coverImg; // This will be the new URL or undefined if not provided

    user = await user.save();

    user.password = null;

    return res.status(200).json(user);
  } catch (error) {
    console.error("Error in updateUser: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getFollowingUsers = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate(
      "following",
      "username fullName profileImg isVerified isGoldVerified"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Wrap the array in an object with a 'users' key
    res.status(200).json(user.following); // <--- CHANGE HERE
  } catch (error) {
    console.log("Error in getFollowingUsers: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getFollowers = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate(
      "followers",
      "username fullName profileImg isVerified isGoldVerified"
    );

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

    await User.updateMany(
      { blockedUsers: userToDelete._id },
      { $pull: { blockedUsers: userToDelete._id } }
    );
    await User.updateMany(
      { blockedBy: userToDelete._id },
      { $pull: { blockedBy: userToDelete._id } }
    );

    if (userToDelete.profileImg) {
      const profileImgId = userToDelete.profileImg.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(profileImgId);
    }
    if (userToDelete.coverImg) {
      const coverImgId = userToDelete.coverImg.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(coverImgId);
    }

    const userPosts = await Post.find({ user: userToDelete._id });
    for (const post of userPosts) {
      if (post.img) {
        const postId = post.img.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(postId);
      }
      await Post.findByIdAndDelete(post._id);
    }

    await Post.updateMany(
      { likes: userToDelete._id },
      { $pull: { likes: userToDelete._id } }
    );

    await Post.updateMany(
      { "comments.user": userToDelete._id },
      { $pull: { comments: { user: userToDelete._id } } }
    );

    await User.updateMany(
      { following: userToDelete._id },
      { $pull: { following: userToDelete._id } }
    );

    await User.updateMany(
      { followers: userToDelete._id },
      { $pull: { followers: userToDelete._id } }
    );

    await Notification.deleteMany({
      $or: [{ from: userToDelete._id }, { to: userToDelete._id }],
    });

    const conversationsToDelete = await Conversation.find({
      participants: userToDelete._id,
    });

    for (const conversation of conversationsToDelete) {
      await Message.deleteMany({ conversationId: conversation._id });
      await Conversation.findByIdAndDelete(conversation._id);
    }

    await PublicChatMessage.deleteMany({ sender: userToDelete._id });

    // ✨ OPTIONAL: If public chat messages can contain images/videos, delete them from Cloudinary too
    // This requires iterating through PublicChatMessages, similar to how you handle Posts.
    // Ensure you fetch messages that actually have an 'img' or 'video' field
    const publicChatMessagesWithMedia = await PublicChatMessage.find({
      sender: userToDelete._id,
      img: { $ne: "" },
    });
    for (const msg of publicChatMessagesWithMedia) {
      if (msg.img) {
        // Assuming public chat images are stored in Cloudinary and follow the same naming convention
        const imgPublicId = msg.img.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(imgPublicId);
      }
      // If you also support video in public chat messages, add similar logic
    }

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
    const { q } = req.query; // q will be the partial username/fullname

    if (!q) {
      return res.status(200).json([]);
    }

    const users = await User.find({
      $or: [
        { username: { $regex: `^${q}`, $options: "i" } }, // Starts with `q`
        { fullName: { $regex: `^${q}`, $options: "i" } }, // Starts with `q`
      ],
    })
      .select("-password") // Only need these for suggestions
      .limit(5); // Limit to a smaller number for quick suggestions, e.g., 5-10

    res.status(200).json(users); // Ensure it returns an array directly, as fixed previously
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
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({
        error: "Forbidden: Only administrators can delete other user accounts.",
      });
    }

    const { id: userIdToDelete } = req.params; // Renamed for clarity

    // Prevent admin from deleting their own account via this endpoint (optional but good practice)
    // If an admin wants to delete their own, they should use the standard deleteUserAccount
    if (userIdToDelete === req.user._id.toString()) {
      return res.status(400).json({
        error: "Please use the 'Delete My Account' option to delete your own account.",
      });
    }

    const userToDelete = await User.findById(userIdToDelete);
    if (!userToDelete) {
      return res.status(404).json({ error: "User not found." });
    }

    // --- Start Deletion Logic (same as your existing controller) ---

    // Remove user from other users' blockedUsers and blockedBy arrays
    await User.updateMany(
      { blockedUsers: userToDelete._id },
      { $pull: { blockedUsers: userToDelete._id } }
    );
    await User.updateMany(
      { blockedBy: userToDelete._id },
      { $pull: { blockedBy: userToDelete._id } }
    );

    // Delete profile and cover images from Cloudinary
    if (userToDelete.profileImg) {
      const profileImgId = userToDelete.profileImg.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(profileImgId);
    }
    if (userToDelete.coverImg) {
      const coverImgId = userToDelete.coverImg.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(coverImgId);
    }

    // Delete user's posts and their images from Cloudinary
    const userPosts = await Post.find({ user: userToDelete._id });
    for (const post of userPosts) {
      if (post.img) {
        const postId = post.img.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(postId);
      }
      await Post.findByIdAndDelete(post._id);
    }

    // Remove user's likes from other posts
    await Post.updateMany(
      { likes: userToDelete._id },
      { $pull: { likes: userToDelete._id } }
    );

    // Remove user's comments from other posts
    await Post.updateMany(
      { "comments.user": userToDelete._id },
      { $pull: { comments: { user: userToDelete._id } } }
    );

    // Remove user from other users' following lists
    await User.updateMany(
      { following: userToDelete._id },
      { $pull: { following: userToDelete._id } }
    );

    // Remove user from other users' followers lists
    await User.updateMany(
      { followers: userToDelete._id },
      { $pull: { followers: userToDelete._id } }
    );

    // Delete all notifications related to this user
    await Notification.deleteMany({
      $or: [{ from: userToDelete._id }, { to: userToDelete._id }],
    });

    // Delete all conversations and messages involving this user
    const conversationsToDelete = await Conversation.find({
      participants: userToDelete._id,
    });

    for (const conversation of conversationsToDelete) {
      await Message.deleteMany({ conversationId: conversation._id });
      await Conversation.findByIdAndDelete(conversation._id);
    }

    // ✨ NEW STEP: Delete public chat messages sent by the user
    await PublicChatMessage.deleteMany({ sender: userToDelete._id });

    // ✨ OPTIONAL: If public chat messages can contain images/videos, delete them from Cloudinary too
    // This requires iterating through PublicChatMessages, similar to how you handle Posts.
    // Example:
    const publicChatMessagesWithMedia = await PublicChatMessage.find({
      sender: userToDelete._id,
      img: { $ne: "" },
    });
    for (const msg of publicChatMessagesWithMedia) {
      if (msg.img) {
        // Assuming public chat images are stored in Cloudinary and follow the same naming convention
        const imgPublicId = msg.img.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(imgPublicId);
      }
      // If you also support video in public chat messages, add similar logic
    }

    // Finally, delete the user document
    await User.findByIdAndDelete(userIdToDelete);

    // --- End Deletion Logic ---

    res.status(200).json({
      message: `Account of ${userToDelete.username} deleted successfully. All associated data has been removed.`,
    });
  } catch (error) {
    console.error("Error in adminDeleteUserAccount: ", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
